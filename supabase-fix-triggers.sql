-- QuoteMaster Pro - Fix Trigger Issues
-- Run this to fix the trigger problems

-- =============================================================================
-- STEP 1: DROP ALL PROBLEMATIC TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Drop all existing triggers that might be causing issues
DROP TRIGGER IF EXISTS make_first_user_admin_trigger ON users;
DROP TRIGGER IF EXISTS log_user_activity_trigger ON users;
DROP TRIGGER IF EXISTS track_system_settings_changes_trigger ON system_settings;
DROP TRIGGER IF EXISTS track_email_template_changes_trigger ON email_templates;
DROP TRIGGER IF EXISTS track_daily_stats_changes_trigger ON daily_stats;

-- Drop all problematic functions
DROP FUNCTION IF EXISTS make_first_user_admin();
DROP FUNCTION IF EXISTS log_user_activity();
DROP FUNCTION IF EXISTS track_system_settings_changes();
DROP FUNCTION IF EXISTS track_email_template_changes();
DROP FUNCTION IF EXISTS track_daily_stats_changes();

-- =============================================================================
-- STEP 2: ADD METADATA COLUMN IF MISSING
-- =============================================================================

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'metadata'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to activity_logs table';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: ADD MISSING RELATIONSHIP COLUMNS
-- =============================================================================

-- Add user tracking columns
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- =============================================================================
-- STEP 4: CREATE SIMPLE, SAFE FUNCTIONS
-- =============================================================================

-- Simple function to make first user admin (without complex logging)
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM users) = 1 THEN
    NEW.role = 'admin';
    NEW.is_super_admin = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function to log basic user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log user registration (simple version)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      NEW.id,
      'user_registered',
      'User registered: ' || NEW.email,
      '{}'::jsonb
    );
    RETURN NEW;
  END IF;
  
  -- Log role changes
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      NEW.id,
      'role_changed',
      'Role changed from ' || OLD.role || ' to ' || NEW.role,
      '{}'::jsonb
    );
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function for system settings tracking
CREATE OR REPLACE FUNCTION track_system_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function for email templates tracking
CREATE OR REPLACE FUNCTION track_email_template_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function for daily stats tracking
CREATE OR REPLACE FUNCTION track_daily_stats_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 5: CREATE NEW TRIGGERS
-- =============================================================================

-- Create triggers with the new functions
CREATE TRIGGER make_first_user_admin_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

CREATE TRIGGER log_user_activity_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER track_system_settings_changes_trigger
  BEFORE INSERT OR UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION track_system_settings_changes();

CREATE TRIGGER track_email_template_changes_trigger
  BEFORE INSERT OR UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION track_email_template_changes();

CREATE TRIGGER track_daily_stats_changes_trigger
  BEFORE INSERT OR UPDATE ON daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION track_daily_stats_changes();

-- =============================================================================
-- STEP 6: CREATE SYSTEM USER SAFELY
-- =============================================================================

-- Create system user without triggering complex functions
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  -- Check if system user exists
  SELECT id INTO system_user_id FROM users WHERE email = 'system@quotemaster.pro';
  
  -- If not exists, create it (temporarily disable triggers)
  IF system_user_id IS NULL THEN
    -- Disable triggers temporarily
    ALTER TABLE users DISABLE TRIGGER log_user_activity_trigger;
    
    INSERT INTO users (id, email, role, business_name, created_at, updated_at)
    VALUES (
      uuid_generate_v4(),
      'system@quotemaster.pro',
      'admin',
      'QuoteMaster System',
      NOW(),
      NOW()
    )
    RETURNING id INTO system_user_id;
    
    -- Re-enable triggers
    ALTER TABLE users ENABLE TRIGGER log_user_activity_trigger;
    
    -- Manual log entry
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      system_user_id,
      'system_user_created',
      'System user created for data integrity',
      '{}'::jsonb
    );
  END IF;
  
  -- Update existing data
  UPDATE system_settings 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  UPDATE email_templates 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  UPDATE daily_stats 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  RAISE NOTICE 'System user created/updated: %', system_user_id;
END $$;

-- =============================================================================
-- STEP 7: CREATE INDEXES AND VIEWS
-- =============================================================================

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata ON activity_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_system_settings_created_by ON system_settings(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_created_by ON daily_stats(created_by);

-- Create views
CREATE OR REPLACE VIEW system_settings_with_users AS
SELECT 
  ss.*,
  cu.email as created_by_email,
  cu.business_name as created_by_name,
  uu.email as updated_by_email,
  uu.business_name as updated_by_name
FROM system_settings ss
LEFT JOIN users cu ON ss.created_by = cu.id
LEFT JOIN users uu ON ss.updated_by = uu.id;

CREATE OR REPLACE VIEW email_templates_with_users AS
SELECT 
  et.*,
  cu.email as created_by_email,
  cu.business_name as created_by_name,
  uu.email as updated_by_email,
  uu.business_name as updated_by_name
FROM email_templates et
LEFT JOIN users cu ON et.created_by = cu.id
LEFT JOIN users uu ON et.updated_by = uu.id;

CREATE OR REPLACE VIEW daily_stats_with_users AS
SELECT 
  ds.*,
  cu.email as created_by_email,
  cu.business_name as created_by_name,
  uu.email as updated_by_email,
  uu.business_name as updated_by_name
FROM daily_stats ds
LEFT JOIN users cu ON ds.created_by = cu.id
LEFT JOIN users uu ON ds.updated_by = uu.id;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'All triggers and relationships fixed successfully!';
  RAISE NOTICE 'System is now ready for user registration';
  RAISE NOTICE 'First user will automatically become admin';
END $$;
