-- QuoteMaster Pro - Clean Fix (Remove All Problematic Triggers)
-- Run this to completely clean and fix the database

-- =============================================================================
-- STEP 1: DISABLE AND DROP ALL TRIGGERS COMPLETELY
-- =============================================================================

-- Disable all triggers on all tables
ALTER TABLE users DISABLE TRIGGER ALL;
ALTER TABLE activity_logs DISABLE TRIGGER ALL;
ALTER TABLE system_settings DISABLE TRIGGER ALL;
ALTER TABLE email_templates DISABLE TRIGGER ALL;
ALTER TABLE daily_stats DISABLE TRIGGER ALL;

-- Drop all triggers explicitly
DROP TRIGGER IF EXISTS make_first_user_admin_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS log_user_activity_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS track_system_settings_changes_trigger ON system_settings CASCADE;
DROP TRIGGER IF EXISTS track_email_template_changes_trigger ON email_templates CASCADE;
DROP TRIGGER IF EXISTS track_daily_stats_changes_trigger ON daily_stats CASCADE;
DROP TRIGGER IF EXISTS update_users_updated_at ON users CASCADE;
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings CASCADE;
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS make_first_user_admin() CASCADE;
DROP FUNCTION IF EXISTS log_user_activity() CASCADE;
DROP FUNCTION IF EXISTS track_system_settings_changes() CASCADE;
DROP FUNCTION IF EXISTS track_email_template_changes() CASCADE;
DROP FUNCTION IF EXISTS track_daily_stats_changes() CASCADE;

-- =============================================================================
-- STEP 2: FIX ACTIVITY_LOGS TABLE STRUCTURE
-- =============================================================================

-- Check and fix activity_logs table
DO $$
BEGIN
    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'metadata'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to activity_logs';
    END IF;
    
    -- Update any NULL metadata to empty JSON
    UPDATE activity_logs SET metadata = '{}' WHERE metadata IS NULL;
    
    RAISE NOTICE 'Activity logs table structure fixed';
END $$;

-- =============================================================================
-- STEP 3: ADD RELATIONSHIP COLUMNS
-- =============================================================================

-- Add user tracking columns safely
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add foreign key constraints after columns exist
DO $$
BEGIN
    -- Add FK for system_settings.created_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'system_settings_created_by_fkey'
    ) THEN
        ALTER TABLE system_settings 
        ADD CONSTRAINT system_settings_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
    
    -- Add FK for system_settings.updated_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'system_settings_updated_by_fkey'
    ) THEN
        ALTER TABLE system_settings 
        ADD CONSTRAINT system_settings_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;
    
    -- Add FK for email_templates.created_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'email_templates_created_by_fkey'
    ) THEN
        ALTER TABLE email_templates 
        ADD CONSTRAINT email_templates_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
    
    -- Add FK for email_templates.updated_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'email_templates_updated_by_fkey'
    ) THEN
        ALTER TABLE email_templates 
        ADD CONSTRAINT email_templates_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;
    
    -- Add FK for daily_stats.created_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_stats_created_by_fkey'
    ) THEN
        ALTER TABLE daily_stats 
        ADD CONSTRAINT daily_stats_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id);
    END IF;
    
    -- Add FK for daily_stats.updated_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'daily_stats_updated_by_fkey'
    ) THEN
        ALTER TABLE daily_stats 
        ADD CONSTRAINT daily_stats_updated_by_fkey 
        FOREIGN KEY (updated_by) REFERENCES users(id);
    END IF;
    
    RAISE NOTICE 'Foreign key constraints added';
END $$;

-- =============================================================================
-- STEP 4: CREATE SYSTEM USER WITHOUT TRIGGERS
-- =============================================================================

-- Create system user safely
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
-- STEP 5: CREATE SIMPLE ADMIN FUNCTION (NO LOGGING)
-- =============================================================================

-- Simple function to make first user admin
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

-- Create only the essential trigger
CREATE TRIGGER make_first_user_admin_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

-- =============================================================================
-- STEP 6: RE-ENABLE BASIC TRIGGERS
-- =============================================================================

-- Re-enable only the updated_at triggers
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON system_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
  BEFORE UPDATE ON email_templates 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 7: CREATE INDEXES
-- =============================================================================

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata ON activity_logs USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_system_settings_created_by ON system_settings(created_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_by ON email_templates(updated_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_created_by ON daily_stats(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_updated_by ON daily_stats(updated_by);

-- =============================================================================
-- STEP 8: CREATE VIEWS
-- =============================================================================

-- Create helpful views
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
-- STEP 9: UPDATE RLS POLICIES
-- =============================================================================

-- Update RLS policies for the new relationships
DROP POLICY IF EXISTS "admins_manage_all_settings" ON system_settings;
CREATE POLICY "admins_manage_all_settings" ON system_settings FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admins_manage_email_templates" ON email_templates;
CREATE POLICY "admins_manage_email_templates" ON email_templates FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admins_view_daily_stats" ON daily_stats;
DROP POLICY IF EXISTS "admins_manage_daily_stats" ON daily_stats;
CREATE POLICY "admins_manage_daily_stats" ON daily_stats FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== DATABASE CLEANUP AND FIX COMPLETED ===';
  RAISE NOTICE 'All problematic triggers removed';
  RAISE NOTICE 'Relationship columns added successfully';
  RAISE NOTICE 'System user created/updated';
  RAISE NOTICE 'Views and indexes created';
  RAISE NOTICE 'RLS policies updated';
  RAISE NOTICE '';
  RAISE NOTICE 'The system is now ready for user registration!';
  RAISE NOTICE 'First user will automatically become admin';
END $$;
