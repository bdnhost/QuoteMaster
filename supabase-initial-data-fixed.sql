-- QuoteMaster Pro - Initial Data Setup (FIXED VERSION)
-- Run this AFTER running supabase-complete-setup.sql and supabase-rls-setup.sql

-- =============================================================================
-- STEP 1: INSERT DEFAULT PAYMENT PROVIDERS
-- =============================================================================

-- Insert payment providers only if they don't exist
INSERT INTO payment_providers (name, display_name, is_active) 
SELECT 'stripe', 'Stripe', true
WHERE NOT EXISTS (SELECT 1 FROM payment_providers WHERE name = 'stripe');

INSERT INTO payment_providers (name, display_name, is_active) 
SELECT 'paypal', 'PayPal', true
WHERE NOT EXISTS (SELECT 1 FROM payment_providers WHERE name = 'paypal');

INSERT INTO payment_providers (name, display_name, is_active) 
SELECT 'bank_transfer', 'Bank Transfer', true
WHERE NOT EXISTS (SELECT 1 FROM payment_providers WHERE name = 'bank_transfer');

-- =============================================================================
-- STEP 2: INSERT DEFAULT SUBSCRIPTION PLANS
-- =============================================================================

-- Insert subscription plans only if they don't exist
INSERT INTO subscription_plans (name, description, price, billing_interval, features) 
SELECT 'free', 'Free Plan', 0.00, 'monthly', '{"max_quotes": 5, "max_storage_mb": 100, "support": "community"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'free');

INSERT INTO subscription_plans (name, description, price, billing_interval, features) 
SELECT 'pro', 'Pro Plan', 29.99, 'monthly', '{"max_quotes": 100, "max_storage_mb": 1000, "support": "email", "custom_branding": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'pro');

INSERT INTO subscription_plans (name, description, price, billing_interval, features) 
SELECT 'enterprise', 'Enterprise Plan', 99.99, 'monthly', '{"max_quotes": -1, "max_storage_mb": 10000, "support": "priority", "custom_branding": true, "api_access": true}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'enterprise');

-- =============================================================================
-- STEP 3: INSERT DEFAULT SYSTEM SETTINGS
-- =============================================================================

-- Insert system settings only if they don't exist
INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'app_name', '"QuoteMaster Pro"'::jsonb, 'Application name', 'general', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'app_name');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'app_version', '"1.0.0"'::jsonb, 'Application version', 'general', true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'app_version');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'default_currency', '"USD"'::jsonb, 'Default currency for quotes and invoices', 'financial', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'default_currency');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'max_file_size_mb', '10'::jsonb, 'Maximum file upload size in MB', 'uploads', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'max_file_size_mb');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'email_from_address', '"noreply@quotemaster.pro"'::jsonb, 'Default from email address', 'email', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'email_from_address');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'stripe_publishable_key', '""'::jsonb, 'Stripe publishable key', 'payments', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'stripe_publishable_key');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'stripe_secret_key', '""'::jsonb, 'Stripe secret key', 'payments', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'stripe_secret_key');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'stripe_webhook_secret', '""'::jsonb, 'Stripe webhook secret', 'payments', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'stripe_webhook_secret');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'paypal_client_id', '""'::jsonb, 'PayPal client ID', 'payments', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'paypal_client_id');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'enable_registrations', 'true'::jsonb, 'Allow new user registrations', 'auth', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'enable_registrations');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'maintenance_mode', 'false'::jsonb, 'Enable maintenance mode', 'system', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'maintenance_mode');

INSERT INTO system_settings (key, value, description, category, is_public) 
SELECT 'default_quote_validity_days', '30'::jsonb, 'Default quote validity period in days', 'quotes', false
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'default_quote_validity_days');

-- =============================================================================
-- STEP 4: INSERT DEFAULT EMAIL TEMPLATES
-- =============================================================================

-- Insert email templates only if they don't exist
INSERT INTO email_templates (name, subject, html_content, text_content, variables) 
SELECT 'quote_sent', 'New Quote: {{quote_number}}', 
 '<h1>New Quote</h1><p>Dear {{client_name}},</p><p>Please find your quote {{quote_number}} attached.</p><p>Total Amount: {{total_amount}}</p><p>Valid Until: {{valid_until}}</p><p>Best regards,<br>{{business_name}}</p>', 
 'Dear {{client_name}}, Please find your quote {{quote_number}} attached. Total Amount: {{total_amount}}. Valid Until: {{valid_until}}. Best regards, {{business_name}}',
 '["quote_number", "client_name", "total_amount", "valid_until", "business_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'quote_sent');

INSERT INTO email_templates (name, subject, html_content, text_content, variables) 
SELECT 'invoice_created', 'Invoice: {{invoice_number}}', 
 '<h1>Invoice</h1><p>Dear {{client_name}},</p><p>Your invoice {{invoice_number}} is ready.</p><p>Amount: {{amount}}</p><p>Due Date: {{due_date}}</p><p>Please pay by the due date.</p><p>Best regards,<br>{{business_name}}</p>', 
 'Dear {{client_name}}, Your invoice {{invoice_number}} is ready. Amount: {{amount}}. Due Date: {{due_date}}. Please pay by the due date. Best regards, {{business_name}}',
 '["invoice_number", "client_name", "amount", "due_date", "business_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'invoice_created');

INSERT INTO email_templates (name, subject, html_content, text_content, variables) 
SELECT 'welcome_user', 'Welcome to QuoteMaster Pro!', 
 '<h1>Welcome to QuoteMaster Pro!</h1><p>Dear {{user_name}},</p><p>Thank you for joining QuoteMaster Pro. You can now create professional quotes and manage your business efficiently.</p><p>Get started by creating your first quote!</p><p>Best regards,<br>The QuoteMaster Pro Team</p>', 
 'Dear {{user_name}}, Thank you for joining QuoteMaster Pro. You can now create professional quotes and manage your business efficiently. Get started by creating your first quote! Best regards, The QuoteMaster Pro Team',
 '["user_name"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = 'welcome_user');

-- =============================================================================
-- STEP 5: CREATE FUNCTION TO MAKE FIRST USER ADMIN
-- =============================================================================

-- Function to automatically make the first user an admin
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM users) = 1 THEN
    NEW.role = 'admin';
    NEW.is_super_admin = true;
    
    -- Log this action
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      NEW.id,
      'first_admin_created',
      'First user automatically promoted to super admin',
      '{"auto_promotion": true}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for first user admin promotion
DROP TRIGGER IF EXISTS make_first_user_admin_trigger ON users;
CREATE TRIGGER make_first_user_admin_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

-- =============================================================================
-- STEP 6: CREATE FUNCTION TO LOG USER ACTIVITIES
-- =============================================================================

-- Function to automatically log user activities
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log user registration
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      NEW.id,
      'user_registered',
      'User registered successfully',
      jsonb_build_object(
        'email', NEW.email,
        'business_name', NEW.business_name,
        'role', NEW.role
      )
    );
    RETURN NEW;
  END IF;
  
  -- Log role changes
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO activity_logs (user_id, action, details, metadata)
    VALUES (
      NEW.id,
      'role_changed',
      'User role changed from ' || OLD.role || ' to ' || NEW.role,
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'changed_by', auth.uid()
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user activity logging
DROP TRIGGER IF EXISTS log_user_activity_trigger ON users;
CREATE TRIGGER log_user_activity_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_activity();

-- =============================================================================
-- STEP 7: CREATE FUNCTION TO UPDATE DAILY STATS
-- =============================================================================

-- Function to update daily statistics
CREATE OR REPLACE FUNCTION update_daily_stats()
RETURNS void AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  total_users_count INTEGER;
  new_users_count INTEGER;
  total_quotes_count INTEGER;
  new_quotes_count INTEGER;
  total_invoices_count INTEGER;
  new_invoices_count INTEGER;
  total_revenue_amount DECIMAL(10,2);
  new_revenue_amount DECIMAL(10,2);
BEGIN
  -- Calculate statistics
  SELECT COUNT(*) INTO total_users_count FROM users;
  SELECT COUNT(*) INTO new_users_count FROM users WHERE DATE(created_at) = today_date;
  SELECT COUNT(*) INTO total_quotes_count FROM quotes;
  SELECT COUNT(*) INTO new_quotes_count FROM quotes WHERE DATE(created_at) = today_date;
  SELECT COUNT(*) INTO total_invoices_count FROM invoices;
  SELECT COUNT(*) INTO new_invoices_count FROM invoices WHERE DATE(created_at) = today_date;
  
  -- Calculate revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO total_revenue_amount 
  FROM invoices WHERE status = 'paid';
  
  SELECT COALESCE(SUM(total_amount), 0) INTO new_revenue_amount 
  FROM invoices WHERE status = 'paid' AND DATE(paid_at) = today_date;
  
  -- Insert or update daily stats
  INSERT INTO daily_stats (
    date, total_users, new_users, total_quotes, new_quotes,
    total_invoices, new_invoices, total_revenue, new_revenue
  ) VALUES (
    today_date, total_users_count, new_users_count, total_quotes_count, new_quotes_count,
    total_invoices_count, new_invoices_count, total_revenue_amount, new_revenue_amount
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    total_quotes = EXCLUDED.total_quotes,
    new_quotes = EXCLUDED.new_quotes,
    total_invoices = EXCLUDED.total_invoices,
    new_invoices = EXCLUDED.new_invoices,
    total_revenue = EXCLUDED.total_revenue,
    new_revenue = EXCLUDED.new_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 8: SUCCESS MESSAGE
-- =============================================================================

-- Create a notification for successful setup
DO $$
BEGIN
  RAISE NOTICE 'QuoteMaster Pro database setup completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure Stripe keys in system_settings';
  RAISE NOTICE '2. Register your first user (will become admin automatically)';
  RAISE NOTICE '3. Test the RLS policies';
  RAISE NOTICE '4. Deploy Edge Functions for payments';
END $$;
