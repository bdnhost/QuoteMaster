-- QuoteMaster Pro - Extended Admin Schema with Payment System
-- Run this after the basic schema

-- =============================================================================
-- PAYMENT SYSTEM TABLES
-- =============================================================================

-- Payment Providers (Stripe, PayPal, etc.)
CREATE TABLE payment_providers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- 'stripe', 'paypal', 'bank_transfer'
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}', -- API keys, webhook URLs, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Transactions
CREATE TABLE payment_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES payment_providers(id),
  external_transaction_id VARCHAR(255), -- Stripe payment_intent_id, PayPal transaction_id
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, refunded
  provider_response JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Plans (for SaaS billing)
CREATE TABLE subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_interval VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
  features JSONB DEFAULT '{}', -- max_quotes, max_users, etc.
  is_active BOOLEAN DEFAULT true,
  stripe_price_id VARCHAR(255), -- Stripe Price ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Subscriptions
CREATE TABLE user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active', -- active, canceled, past_due, unpaid
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ADMIN SYSTEM TABLES
-- =============================================================================

-- System Settings
CREATE TABLE system_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'general',
  is_public BOOLEAN DEFAULT false, -- Can be accessed by non-admin users
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates
CREATE TABLE email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '[]', -- Available template variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quote Templates
CREATE TABLE quote_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL, -- Quote structure, default items, etc.
  is_public BOOLEAN DEFAULT false, -- Can be used by other users
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
  is_read BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File Uploads
CREATE TABLE file_uploads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

-- Daily Statistics
CREATE TABLE daily_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_quotes INTEGER DEFAULT 0,
  new_quotes INTEGER DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  new_invoices INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  new_revenue DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Payment system indexes
CREATE INDEX idx_payment_transactions_invoice_id ON payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- Admin system indexes
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_email_templates_name ON email_templates(name);
CREATE INDEX idx_quote_templates_user_id ON quote_templates(user_id);
CREATE INDEX idx_quote_templates_is_public ON quote_templates(is_public);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_file_uploads_user_id ON file_uploads(user_id);

-- Analytics indexes
CREATE INDEX idx_daily_stats_date ON daily_stats(date);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

CREATE TRIGGER update_payment_providers_updated_at 
  BEFORE UPDATE ON payment_providers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at 
  BEFORE UPDATE ON payment_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
  BEFORE UPDATE ON system_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
  BEFORE UPDATE ON email_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_templates_updated_at 
  BEFORE UPDATE ON quote_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Insert default payment providers
INSERT INTO payment_providers (name, display_name, is_active) VALUES
('stripe', 'Stripe', true),
('paypal', 'PayPal', true),
('bank_transfer', 'Bank Transfer', true);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, billing_interval, features) VALUES
('free', 'Free Plan', 0.00, 'monthly', '{"max_quotes": 5, "max_storage_mb": 100, "support": "community"}'),
('pro', 'Pro Plan', 29.99, 'monthly', '{"max_quotes": 100, "max_storage_mb": 1000, "support": "email", "custom_branding": true}'),
('enterprise', 'Enterprise Plan', 99.99, 'monthly', '{"max_quotes": -1, "max_storage_mb": 10000, "support": "priority", "custom_branding": true, "api_access": true}');

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
('app_name', '"QuoteMaster Pro"', 'Application name', 'general', true),
('app_version', '"1.0.0"', 'Application version', 'general', true),
('default_currency', '"USD"', 'Default currency for quotes and invoices', 'financial', false),
('max_file_size_mb', '10', 'Maximum file upload size in MB', 'uploads', false),
('email_from_address', '"noreply@quotemaster.pro"', 'Default from email address', 'email', false),
('stripe_publishable_key', '""', 'Stripe publishable key', 'payments', false),
('paypal_client_id', '""', 'PayPal client ID', 'payments', false);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content, variables) VALUES
('quote_sent', 'New Quote: {{quote_number}}', 
 '<h1>New Quote</h1><p>Dear {{client_name}},</p><p>Please find your quote {{quote_number}} attached.</p>', 
 'Dear {{client_name}}, Please find your quote {{quote_number}} attached.',
 '["quote_number", "client_name", "total_amount"]'),
('invoice_created', 'Invoice: {{invoice_number}}', 
 '<h1>Invoice</h1><p>Dear {{client_name}},</p><p>Your invoice {{invoice_number}} is ready.</p>', 
 'Dear {{client_name}}, Your invoice {{invoice_number}} is ready.',
 '["invoice_number", "client_name", "amount", "due_date"]');
