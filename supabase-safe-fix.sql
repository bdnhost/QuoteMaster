-- QuoteMaster Pro - Safe Fix (No System Triggers)
-- Run this to safely fix the database without touching system triggers

-- =============================================================================
-- STEP 1: DROP ONLY USER-CREATED TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Drop only our custom triggers (not system triggers)
DROP TRIGGER IF EXISTS make_first_user_admin_trigger ON users;
DROP TRIGGER IF EXISTS log_user_activity_trigger ON users;
DROP TRIGGER IF EXISTS track_system_settings_changes_trigger ON system_settings;
DROP TRIGGER IF EXISTS track_email_template_changes_trigger ON email_templates;
DROP TRIGGER IF EXISTS track_daily_stats_changes_trigger ON daily_stats;

-- Drop our custom functions
DROP FUNCTION IF EXISTS make_first_user_admin();
DROP FUNCTION IF EXISTS log_user_activity();
DROP FUNCTION IF EXISTS track_system_settings_changes();
DROP FUNCTION IF EXISTS track_email_template_changes();
DROP FUNCTION IF EXISTS track_daily_stats_changes();

-- =============================================================================
-- STEP 2: FIX ACTIVITY_LOGS TABLE STRUCTURE
-- =============================================================================

-- Add metadata column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'metadata'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to activity_logs';
    ELSE
        RAISE NOTICE 'Metadata column already exists';
    END IF;
    
    -- Update any NULL metadata to empty JSON
    UPDATE activity_logs SET metadata = '{}' WHERE metadata IS NULL;
END $$;

-- =============================================================================
-- STEP 3: ADD RELATIONSHIP COLUMNS SAFELY
-- =============================================================================

-- Add user tracking columns
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add foreign key constraints safely
DO $$
BEGIN
    -- System settings foreign keys
    BEGIN
        ALTER TABLE system_settings 
        ADD CONSTRAINT system_settings_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'FK system_settings_created_by_fkey already exists';
    END;
    
    BEGIN
        ALTER TABLE system_settings 
        ADD CONSTRAINT system_settings_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id);
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'FK system_settings_updated_by_fkey already exists';
    END;
    
    -- Email templates foreign keys
    BEGIN
        ALTER TABLE email_templates 
        ADD CONSTRAINT email_templates_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'FK email_templates_created_by_fkey already exists';
    END;
    
    BEGIN
        ALTER TABLE email_templates 
        ADD CONSTRAINT email_templates_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id);
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'FK email_templates_updated_by_fkey already exists';
    END;
    
    -- Daily stats foreign keys
    BEGIN
        ALTER TABLE daily_stats 
        ADD CONSTRAINT daily_stats_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'FK daily_stats_created_by_fkey already exists';
    END;
    
    BEGIN
        ALTER TABLE daily_stats 
        ADD CONSTRAINT daily_stats_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id);
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'FK daily_stats_updated_by_fkey already exists';
    END;
END $$;

-- =============================================================================
-- STEP 4: CREATE SYSTEM USER SAFELY
-- =============================================================================

-- Create system user without any triggers
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
    
    RAISE NOTICE 'System user created with ID: %', system_user_id;
  ELSE
    RAISE NOTICE 'System user already exists with ID: %', system_user_id;
  END IF;
  
  -- Update existing data with system user
  UPDATE system_settings 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  UPDATE email_templates 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  UPDATE daily_stats 
  SET created_by = system_user_id, updated_by = system_user_id
  WHERE created_by IS NULL;
  
  RAISE NOTICE 'Updated existing data with system user';
END $$;

-- =============================================================================
-- STEP 5: CREATE MINIMAL ADMIN FUNCTION
-- =============================================================================

-- Simple function to make first user admin (no logging)
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user (excluding system user)
  IF (SELECT COUNT(*) FROM users WHERE email != 'system@quotemaster.pro') = 0 THEN
    NEW.role = 'admin';
    NEW.is_super_admin = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER make_first_user_admin_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

-- =============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata ON activity_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_system_settings_created_by ON system_settings(created_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_by ON email_templates(updated_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_daily_stats_created_by ON daily_stats(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_updated_by ON daily_stats(updated_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);

-- =============================================================================
-- STEP 7: CREATE HELPFUL VIEWS
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
-- STEP 8: UPDATE RLS POLICIES
-- =============================================================================

-- Update system_settings policies
DROP POLICY IF EXISTS "admins_manage_all_settings" ON system_settings;
CREATE POLICY "admins_manage_all_settings" ON system_settings FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Update email_templates policies
DROP POLICY IF EXISTS "admins_manage_email_templates" ON email_templates;
CREATE POLICY "admins_manage_email_templates" ON email_templates FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Update daily_stats policies
DROP POLICY IF EXISTS "admins_view_daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "admins_manage_daily_stats" ON daily_stats;
CREATE POLICY "admins_manage_daily_stats" ON daily_stats FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =============================================================================
-- STEP 9: CREATE UTILITY FUNCTION FOR MANUAL LOGGING
-- =============================================================================

-- Function for manual activity logging (no triggers)
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_details TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, action, details, metadata)
  VALUES (p_user_id, p_action, p_details, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== SAFE DATABASE FIX COMPLETED ===';
  RAISE NOTICE 'User-created triggers removed safely';
  RAISE NOTICE 'Relationship columns added successfully';
  RAISE NOTICE 'System user created/updated';
  RAISE NOTICE 'Views and indexes created';
  RAISE NOTICE 'RLS policies updated';
  RAISE NOTICE 'Manual logging function created';
  RAISE NOTICE '';
  RAISE NOTICE 'The system is now ready for user registration!';
  RAISE NOTICE 'First user (excluding system) will automatically become admin';
  RAISE NOTICE '';
  RAISE NOTICE 'Use log_activity() function for manual logging if needed';
END $$;
