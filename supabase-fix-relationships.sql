-- QuoteMaster Pro - Fix Table Relationships
-- Run this to add missing relationships and improve data integrity

-- =============================================================================
-- STEP 1: ADD MISSING COLUMNS FOR RELATIONSHIPS
-- =============================================================================

-- Add user tracking to system_settings
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add user tracking to email_templates  
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Add user tracking to daily_stats (for manual entries)
ALTER TABLE daily_stats
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- =============================================================================
-- STEP 2: CREATE FUNCTIONS TO AUTO-POPULATE USER TRACKING
-- =============================================================================

-- Function to set created_by and updated_by for system_settings
CREATE OR REPLACE FUNCTION track_system_settings_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
    
    -- Log the change
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      auth.uid(),
      'system_setting_created',
      'System setting created: ' || NEW.key,
      jsonb_build_object(
        'key', NEW.key,
        'category', NEW.category,
        'is_public', NEW.is_public
      )
    );
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    
    -- Log the change if value changed
    IF OLD.value != NEW.value THEN
      INSERT INTO activity_logs (user_id, action, details, metadata)
      VALUES (
        auth.uid(),
        'system_setting_updated',
        'System setting updated: ' || NEW.key,
        jsonb_build_object(
          'key', NEW.key,
          'old_value', OLD.value,
          'new_value', NEW.value
        )
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
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      auth.uid(),
      'email_template_created',
      'Email template created: ' || NEW.name,
      jsonb_build_object(
        'template_name', NEW.name,
        'subject', NEW.subject,
        'is_active', NEW.is_active
      )
    );
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    
    -- Log the change
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      auth.uid(),
      'email_template_updated',
      'Email template updated: ' || NEW.name,
      jsonb_build_object(
        'template_name', NEW.name,
        'changes', jsonb_build_object(
          'subject_changed', OLD.subject != NEW.subject,
          'content_changed', OLD.html_content != NEW.html_content,
          'status_changed', OLD.is_active != NEW.is_active
        )
      )
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
      INSERT INTO activity_logs (user_id, action, details, metadata)
      VALUES (
        auth.uid(),
        'daily_stats_created',
        'Daily statistics entry created for: ' || NEW.date,
        jsonb_build_object(
          'date', NEW.date,
          'total_users', NEW.total_users,
          'total_quotes', NEW.total_quotes,
          'total_revenue', NEW.total_revenue
        )
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    
    -- Log manual stats update
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO activity_logs (user_id, action, details, metadata)
      VALUES (
        auth.uid(),
        'daily_stats_updated',
        'Daily statistics updated for: ' || NEW.date,
        jsonb_build_object(
          'date', NEW.date,
          'manual_update', true
        )
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 3: CREATE TRIGGERS
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
-- STEP 4: UPDATE EXISTING DATA WITH SYSTEM USER
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
    
    -- Log system user creation
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      system_user_id,
      'system_user_created',
      'System user created for data integrity',
      '{"auto_created": true}'::jsonb
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
-- STEP 5: ADD INDEXES FOR PERFORMANCE
-- =============================================================================

-- Add indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_system_settings_created_by ON system_settings(created_by);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_updated_by ON email_templates(updated_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_created_by ON daily_stats(created_by);
CREATE INDEX IF NOT EXISTS idx_daily_stats_updated_by ON daily_stats(updated_by);

-- =============================================================================
-- STEP 6: UPDATE RLS POLICIES FOR BETTER RELATIONSHIPS
-- =============================================================================

-- Update system_settings policies to include user tracking
DROP POLICY IF EXISTS "admins_manage_all_settings" ON system_settings;
CREATE POLICY "admins_manage_all_settings" ON system_settings FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Add policy for viewing settings created by user
CREATE POLICY "users_view_settings_they_created" ON system_settings FOR SELECT 
USING (created_by = auth.uid() AND is_public = false);

-- Update email_templates policies
DROP POLICY IF EXISTS "admins_manage_email_templates" ON email_templates;
CREATE POLICY "admins_manage_email_templates" ON email_templates FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- Add policy for viewing templates created by user
CREATE POLICY "users_view_templates_they_created" ON email_templates FOR SELECT 
USING (created_by = auth.uid());

-- Update daily_stats policies
DROP POLICY IF EXISTS "admins_view_daily_stats" ON daily_stats;
CREATE POLICY "admins_view_daily_stats" ON daily_stats FOR SELECT 
USING (is_admin());

CREATE POLICY "admins_manage_daily_stats" ON daily_stats FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =============================================================================
-- STEP 7: CREATE VIEWS FOR BETTER DATA ACCESS
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
  RAISE NOTICE 'Table relationships fixed successfully!';
  RAISE NOTICE 'Added user tracking to: system_settings, email_templates, daily_stats';
  RAISE NOTICE 'Created audit triggers for all changes';
  RAISE NOTICE 'Updated RLS policies for better security';
  RAISE NOTICE 'Created views for easier data access';
END $$;
