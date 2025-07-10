-- QuoteMaster Pro - Comprehensive RLS Policies
-- Run this in Supabase SQL Editor after creating the schema

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================

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
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Admins can update any user
CREATE POLICY "admins_update_all_users" ON users FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =============================================================================
-- QUOTES TABLE POLICIES
-- =============================================================================

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
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Admins can update any quote
CREATE POLICY "admins_update_all_quotes" ON quotes FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =============================================================================
-- QUOTE_ITEMS TABLE POLICIES
-- =============================================================================

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
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =============================================================================
-- ACTIVITY_LOGS TABLE POLICIES
-- =============================================================================

-- Users can view only their own activity logs
CREATE POLICY "activity_logs_select_own" ON activity_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own activity logs
CREATE POLICY "activity_logs_insert_own" ON activity_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activity logs
CREATE POLICY "admins_select_all_activity_logs" ON activity_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =============================================================================
-- PAYMENT_METHODS TABLE POLICIES
-- =============================================================================

-- Users can view only their own payment methods
CREATE POLICY "payment_methods_select_own" ON payment_methods FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own payment methods
CREATE POLICY "payment_methods_insert_own" ON payment_methods FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own payment methods
CREATE POLICY "payment_methods_update_own" ON payment_methods FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own payment methods
CREATE POLICY "payment_methods_delete_own" ON payment_methods FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can manage all payment methods
CREATE POLICY "admins_manage_all_payment_methods" ON payment_methods FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =============================================================================
-- INVOICES TABLE POLICIES
-- =============================================================================

-- Users can view invoices for their own quotes
CREATE POLICY "invoices_select_own" ON invoices FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = invoices.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

-- Users can create invoices for their own quotes
CREATE POLICY "invoices_insert_own" ON invoices FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = invoices.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

-- Users can update invoices for their own quotes
CREATE POLICY "invoices_update_own" ON invoices FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = invoices.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

-- Admins can manage all invoices
CREATE POLICY "admins_manage_all_invoices" ON invoices FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =============================================================================
-- HELPER FUNCTIONS FOR ADMIN CHECKS
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
-- EXTENDED RLS POLICIES FOR ADMIN TABLES
-- =============================================================================

-- Enable RLS on new tables
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

-- Payment Providers - Admin only
CREATE POLICY "admins_manage_payment_providers" ON payment_providers FOR ALL
USING (is_admin());

-- Payment Transactions - Users see their own, admins see all
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
CREATE POLICY "public_view_subscription_plans" ON subscription_plans FOR SELECT
USING (is_active = true);

CREATE POLICY "admins_manage_subscription_plans" ON subscription_plans FOR ALL
USING (is_admin());

-- User Subscriptions - Users see their own, admins see all
CREATE POLICY "users_view_own_subscription" ON user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_subscription" ON user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "admins_manage_all_subscriptions" ON user_subscriptions FOR ALL
USING (is_admin());

-- System Settings - Public settings for all, private for admins
CREATE POLICY "public_view_public_settings" ON system_settings FOR SELECT
USING (is_public = true);

CREATE POLICY "admins_manage_all_settings" ON system_settings FOR ALL
USING (is_admin());

-- Email Templates - Admin only
CREATE POLICY "admins_manage_email_templates" ON email_templates FOR ALL
USING (is_admin());

-- Quote Templates - Users manage their own, public templates for all
CREATE POLICY "users_view_accessible_templates" ON quote_templates FOR SELECT
USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "users_manage_own_templates" ON quote_templates FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "admins_manage_all_templates" ON quote_templates FOR ALL
USING (is_admin());

-- Notifications - Users see their own
CREATE POLICY "users_view_own_notifications" ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "system_create_notifications" ON notifications FOR INSERT
WITH CHECK (true); -- Allow system to create notifications

CREATE POLICY "admins_manage_all_notifications" ON notifications FOR ALL
USING (is_admin());

-- File Uploads - Users manage their own, admins see all
CREATE POLICY "users_manage_own_files" ON file_uploads FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "public_view_public_files" ON file_uploads FOR SELECT
USING (is_public = true);

CREATE POLICY "admins_manage_all_files" ON file_uploads FOR ALL
USING (is_admin());

-- Daily Stats - Admin only
CREATE POLICY "admins_view_daily_stats" ON daily_stats FOR SELECT
USING (is_admin());
