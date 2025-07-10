-- QuoteMaster Pro - Fix Missing Metadata Column
-- Run this to fix the missing metadata column in activity_logs

-- =============================================================================
-- STEP 1: CHECK AND ADD MISSING METADATA COLUMN
-- =============================================================================

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    -- Check if metadata column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'metadata'
        AND table_schema = 'public'
    ) THEN
        -- Add the missing column
        ALTER TABLE activity_logs ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to activity_logs table';
    ELSE
        RAISE NOTICE 'Metadata column already exists in activity_logs table';
    END IF;
END $$;

-- =============================================================================
-- STEP 2: UPDATE EXISTING ACTIVITY_LOGS WITH EMPTY METADATA
-- =============================================================================

-- Update any existing records that might have NULL metadata
UPDATE activity_logs 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;

-- =============================================================================
-- STEP 3: CREATE INDEX FOR METADATA COLUMN
-- =============================================================================

-- Add index for metadata column for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata ON activity_logs USING GIN (metadata);

-- =============================================================================
-- STEP 4: VERIFY THE COLUMN EXISTS AND RETRY THE RELATIONSHIPS FIX
-- =============================================================================

-- Now let's add the missing relationships with a safer approach
-- Add user tracking to system_settings
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add user tracking to email_templates  
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add user tracking to daily_stats
ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- =============================================================================
-- STEP 5: CREATE SAFER FUNCTIONS (WITHOUT METADATA INITIALLY)
-- =============================================================================

-- Function to set created_by and updated_by for system_settings
CREATE OR REPLACE FUNCTION track_system_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    
    -- Log the change (simple version first)
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (
      auth.uid(),
      'system_setting_created',
      'System setting created: ' || NEW.key
    );
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    
    -- Log the change if value changed
    IF OLD.value != NEW.value THEN
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (
        auth.uid(),
        'system_setting_updated',
        'System setting updated: ' || NEW.key
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set created_by and updated_by for email_templates
CREATE OR REPLACE FUNCTION track_email_template_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    
    -- Log the change
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (
      auth.uid(),
      'email_template_created',
      'Email template created: ' || NEW.name
    );
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    
    -- Log the change
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (
      auth.uid(),
      'email_template_updated',
      'Email template updated: ' || NEW.name
    );
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track daily_stats changes
CREATE OR REPLACE FUNCTION track_daily_stats_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    
    -- Log manual stats entry
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (
        auth.uid(),
        'daily_stats_created',
        'Daily statistics entry created for: ' || NEW.date
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    
    -- Log manual stats update
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO activity_logs (user_id, action, details)
      VALUES (
        auth.uid(),
        'daily_stats_updated',
        'Daily statistics updated for: ' || NEW.date
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 6: CREATE TRIGGERS
-- =============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS track_system_settings_changes_trigger ON system_settings;
DROP TRIGGER IF EXISTS track_email_template_changes_trigger ON email_templates;
DROP TRIGGER IF EXISTS track_daily_stats_changes_trigger ON daily_stats;

-- Create new triggers
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
-- STEP 7: CREATE SYSTEM USER AND UPDATE EXISTING DATA
-- =============================================================================

-- Create a system user for existing data (if doesn't exist)
DO $$
DECLARE
  system_user_id UUID;
BEGIN
  -- Check if system user exists
  SELECT id INTO system_user_id FROM users WHERE email = 'system@quotemaster.pro';
  
  -- If not exists, create it
  IF system_user_id IS NULL THEN
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
    
    -- Log system user creation (simple version)
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (
      system_user_id,
      'system_user_created',
      'System user created for data integrity'
    );
  END IF;
  
  -- Update existing system_settings without created_by
  UPDATE system_settings 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  -- Update existing email_templates without created_by
  UPDATE email_templates 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  -- Update existing daily_stats without created_by
  UPDATE daily_stats 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  RAISE NOTICE 'Updated existing data with system user: %', system_user_id;
END $$;

-- =============================================================================
-- STEP 8: ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- Add indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_system_settings_created_by ON system_settings(created_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_by ON email_templates(updated_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_created_by ON daily_stats(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_updated_by ON daily_stats(updated_by);

-- =============================================================================
-- STEP 9: CREATE VIEWS FOR BETTER DATA ACCESS
-- =============================================================================

-- View for system settings with user info
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

-- View for email templates with user info
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

-- View for daily stats with user info
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
  RAISE NOTICE 'Metadata column and relationships fixed successfully!';
  RAISE NOTICE 'Added user tracking to: system_settings, email_templates, daily_stats';
  RAISE NOTICE 'Created audit triggers for all changes';
  RAISE NOTICE 'Created views for easier data access';
END $$;
