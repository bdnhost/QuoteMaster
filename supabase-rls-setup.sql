-- QuoteMaster Pro - Row Level Security Setup
-- Run this AFTER running supabase-complete-setup.sql

-- =============================================================================
-- STEP 1: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 2: HELPER FUNCTIONS
-- =============================================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns a quote
CREATE OR REPLACE FUNCTION owns_quote(quote_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_id 
    AND quotes.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 3: USERS TABLE POLICIES
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "admins_select_all_users" ON users;
DROP POLICY IF EXISTS "admins_update_all_users" ON users;

-- Users can only view their own profile
CREATE POLICY "users_select_own" ON users FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users FOR UPDATE 
USING (auth.uid() = id);

-- Users can insert their own profile (for registration)
CREATE POLICY "users_insert_own" ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "admins_select_all_users" ON users FOR SELECT 
USING (is_admin());

-- Admins can update any user
CREATE POLICY "admins_update_all_users" ON users FOR UPDATE 
USING (is_admin());

-- =============================================================================
-- STEP 4: QUOTES TABLE POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "quotes_select_own" ON quotes;
DROP POLICY IF EXISTS "quotes_insert_own" ON quotes;
DROP POLICY IF EXISTS "quotes_update_own" ON quotes;
DROP POLICY IF EXISTS "quotes_delete_own" ON quotes;
DROP POLICY IF EXISTS "admins_select_all_quotes" ON quotes;
DROP POLICY IF EXISTS "admins_update_all_quotes" ON quotes;

-- Users can view only their own quotes
CREATE POLICY "quotes_select_own" ON quotes FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create quotes (must be their own)
CREATE POLICY "quotes_insert_own" ON quotes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update only their own quotes
CREATE POLICY "quotes_update_own" ON quotes FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete only their own quotes
CREATE POLICY "quotes_delete_own" ON quotes FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can view all quotes
CREATE POLICY "admins_select_all_quotes" ON quotes FOR SELECT 
USING (is_admin());

-- Admins can update any quote
CREATE POLICY "admins_update_all_quotes" ON quotes FOR UPDATE 
USING (is_admin());

-- =============================================================================
-- STEP 5: QUOTE_ITEMS TABLE POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "quote_items_select_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_insert_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_update_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_delete_own" ON quote_items;
DROP POLICY IF EXISTS "admins_manage_all_quote_items" ON quote_items;

-- Users can view quote items for their own quotes
CREATE POLICY "quote_items_select_own" ON quote_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

-- Users can create quote items for their own quotes
CREATE POLICY "quote_items_insert_own" ON quote_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

-- Users can update quote items for their own quotes
CREATE POLICY "quote_items_update_own" ON quote_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

-- Users can delete quote items for their own quotes
CREATE POLICY "quote_items_delete_own" ON quote_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

-- Admins can manage all quote items
CREATE POLICY "admins_manage_all_quote_items" ON quote_items FOR ALL 
USING (is_admin());

-- =============================================================================
-- STEP 6: ACTIVITY_LOGS TABLE POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "activity_logs_select_own" ON activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_own" ON activity_logs;
DROP POLICY IF EXISTS "admins_select_all_activity_logs" ON activity_logs;

-- Users can view only their own activity logs
CREATE POLICY "activity_logs_select_own" ON activity_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own activity logs
CREATE POLICY "activity_logs_insert_own" ON activity_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity logs
CREATE POLICY "admins_select_all_activity_logs" ON activity_logs FOR SELECT 
USING (is_admin());

-- =============================================================================
-- STEP 7: PAYMENT SYSTEM POLICIES
-- =============================================================================

-- Payment Providers - Admin only
DROP POLICY IF EXISTS "admins_manage_payment_providers" ON payment_providers;
CREATE POLICY "admins_manage_payment_providers" ON payment_providers FOR ALL 
USING (is_admin());

-- Payment Transactions - Users see their own, admins see all
DROP POLICY IF EXISTS "users_view_own_transactions" ON payment_transactions;
DROP POLICY IF EXISTS "admins_manage_all_transactions" ON payment_transactions;

CREATE POLICY "users_view_own_transactions" ON payment_transactions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM invoices 
    JOIN quotes ON quotes.id = invoices.quote_id 
    WHERE invoices.id = payment_transactions.invoice_id 
    AND quotes.user_id = auth.uid()
  )
);

CREATE POLICY "admins_manage_all_transactions" ON payment_transactions FOR ALL 
USING (is_admin());

-- Subscription Plans - Public read, admin manage
DROP POLICY IF EXISTS "public_view_subscription_plans" ON subscription_plans;
DROP POLICY IF EXISTS "admins_manage_subscription_plans" ON subscription_plans;

CREATE POLICY "public_view_subscription_plans" ON subscription_plans FOR SELECT 
USING (is_active = true);

CREATE POLICY "admins_manage_subscription_plans" ON subscription_plans FOR ALL 
USING (is_admin());

-- User Subscriptions - Users see their own, admins see all
DROP POLICY IF EXISTS "users_view_own_subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "users_update_own_subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "admins_manage_all_subscriptions" ON user_subscriptions;

CREATE POLICY "users_view_own_subscription" ON user_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_subscription" ON user_subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "admins_manage_all_subscriptions" ON user_subscriptions FOR ALL 
USING (is_admin());

-- System Settings - Public settings for all, private for admins
DROP POLICY IF EXISTS "public_view_public_settings" ON system_settings;
DROP POLICY IF EXISTS "admins_manage_all_settings" ON system_settings;

CREATE POLICY "public_view_public_settings" ON system_settings FOR SELECT 
USING (is_public = true);

CREATE POLICY "admins_manage_all_settings" ON system_settings FOR ALL 
USING (is_admin());

-- Email Templates - Admin only
DROP POLICY IF EXISTS "admins_manage_email_templates" ON email_templates;
CREATE POLICY "admins_manage_email_templates" ON email_templates FOR ALL 
USING (is_admin());

-- Notifications - Users see their own
DROP POLICY IF EXISTS "users_view_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "system_create_notifications" ON notifications;
DROP POLICY IF EXISTS "admins_manage_all_notifications" ON notifications;

CREATE POLICY "users_view_own_notifications" ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "system_create_notifications" ON notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "admins_manage_all_notifications" ON notifications FOR ALL 
USING (is_admin());

-- Daily Stats - Admin only
DROP POLICY IF EXISTS "admins_view_daily_stats" ON daily_stats;
CREATE POLICY "admins_view_daily_stats" ON daily_stats FOR SELECT 
USING (is_admin());
