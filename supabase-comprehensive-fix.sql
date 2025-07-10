-- QuoteMaster Pro - Comprehensive System Fix
-- Run this to fix all critical issues systematically

-- =============================================================================
-- STEP 1: DIAGNOSE AND FIX ADMIN ROLE ASSIGNMENT
-- =============================================================================

-- First, let's see what we have (skip this if users table was just fixed)
DO $$
DECLARE
  user_count INTEGER;
  admin_count INTEGER;
  system_user_exists BOOLEAN;
  col_exists BOOLEAN;
BEGIN
  -- Check if is_super_admin column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'is_super_admin'
    AND table_schema = 'public'
  ) INTO col_exists;

  IF NOT col_exists THEN
    RAISE EXCEPTION 'is_super_admin column missing. Please run supabase-fix-users-table.sql first!';
  END IF;

  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin';
  SELECT EXISTS(SELECT 1 FROM users WHERE email = 'system@quotemaster.pro') INTO system_user_exists;

  RAISE NOTICE 'Current state:';
  RAISE NOTICE '- Total users: %', user_count;
  RAISE NOTICE '- Admin users: %', admin_count;
  RAISE NOTICE '- System user exists: %', system_user_exists;
END $$;

-- Fix the admin assignment trigger
DROP TRIGGER IF EXISTS make_first_user_admin_trigger ON users;
DROP FUNCTION IF EXISTS make_first_user_admin();

-- Create corrected function that excludes system user
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  real_user_count INTEGER;
BEGIN
  -- Count only real users (exclude system user)
  SELECT COUNT(*) INTO real_user_count 
  FROM users 
  WHERE email != 'system@quotemaster.pro' 
  AND email != NEW.email; -- Don't count the user being inserted
  
  -- If this is the first real user, make them admin
  IF real_user_count = 0 AND NEW.email != 'system@quotemaster.pro' THEN
    NEW.role = 'admin';
    NEW.is_super_admin = true;
    RAISE NOTICE 'First real user % promoted to admin', NEW.email;
  ELSE
    -- Ensure regular users stay regular users
    NEW.role = COALESCE(NEW.role, 'user');
    NEW.is_super_admin = COALESCE(NEW.is_super_admin, false);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER make_first_user_admin_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

-- Fix existing users (reset all except first real user to regular user)
DO $$
DECLARE
  first_real_user_id UUID;
  user_record RECORD;
BEGIN
  -- Find the first real user (not system user)
  SELECT id INTO first_real_user_id
  FROM users 
  WHERE email != 'system@quotemaster.pro'
  ORDER BY created_at 
  LIMIT 1;
  
  -- Reset all users except the first real user
  FOR user_record IN 
    SELECT id, email FROM users 
    WHERE email != 'system@quotemaster.pro'
  LOOP
    IF user_record.id = first_real_user_id THEN
      -- Keep first user as admin
      UPDATE users 
      SET role = 'admin', is_super_admin = true 
      WHERE id = user_record.id;
      RAISE NOTICE 'User % confirmed as admin', user_record.email;
    ELSE
      -- Make others regular users
      UPDATE users 
      SET role = 'user', is_super_admin = false 
      WHERE id = user_record.id;
      RAISE NOTICE 'User % changed to regular user', user_record.email;
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 2: FIX AUTHENTICATION AND RLS ISSUES
-- =============================================================================

-- Add missing RLS policies for quotes that might be causing auth issues
DROP POLICY IF EXISTS "users_insert_quotes" ON quotes;
DROP POLICY IF EXISTS "users_select_quotes" ON quotes;
DROP POLICY IF EXISTS "users_update_quotes" ON quotes;
DROP POLICY IF EXISTS "users_delete_quotes" ON quotes;

-- Recreate quotes policies with better logic
CREATE POLICY "users_select_quotes" ON quotes FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "users_insert_quotes" ON quotes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_quotes" ON quotes FOR UPDATE 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "users_delete_quotes" ON quotes FOR DELETE 
USING (auth.uid() = user_id OR is_admin());

-- Fix quote_items policies
DROP POLICY IF EXISTS "quote_items_select_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_insert_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_update_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_delete_own" ON quote_items;

CREATE POLICY "quote_items_select_own" ON quote_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND (quotes.user_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "quote_items_insert_own" ON quote_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

CREATE POLICY "quote_items_update_own" ON quote_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND (quotes.user_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "quote_items_delete_own" ON quote_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND (quotes.user_id = auth.uid() OR is_admin())
  )
);

-- =============================================================================
-- STEP 3: FIX INVOICES POLICIES (MISSING FROM ORIGINAL)
-- =============================================================================

-- Add missing invoices policies
CREATE POLICY "users_select_invoices" ON invoices FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = invoices.quote_id 
    AND (quotes.user_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "users_insert_invoices" ON invoices FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = invoices.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_invoices" ON invoices FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = invoices.quote_id 
    AND (quotes.user_id = auth.uid() OR is_admin())
  )
);

CREATE POLICY "users_delete_invoices" ON invoices FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = invoices.quote_id 
    AND (quotes.user_id = auth.uid() OR is_admin())
  )
);

-- =============================================================================
-- STEP 4: FIX PAYMENT_METHODS POLICIES (MISSING FROM ORIGINAL)
-- =============================================================================

-- Add missing payment_methods policies
CREATE POLICY "users_select_payment_methods" ON payment_methods FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "users_insert_payment_methods" ON payment_methods FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_payment_methods" ON payment_methods FOR UPDATE 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "users_delete_payment_methods" ON payment_methods FOR DELETE 
USING (auth.uid() = user_id OR is_admin());

-- =============================================================================
-- STEP 5: CREATE COMPREHENSIVE VERIFICATION FUNCTION
-- =============================================================================

-- Function to verify all RLS policies exist
CREATE OR REPLACE FUNCTION verify_rls_policies()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity,
    COALESCE(p.policy_count, 0),
    CASE 
      WHEN NOT t.rowsecurity THEN 'RLS_DISABLED'
      WHEN COALESCE(p.policy_count, 0) = 0 THEN 'NO_POLICIES'
      WHEN COALESCE(p.policy_count, 0) < 4 THEN 'FEW_POLICIES'
      ELSE 'OK'
    END::TEXT
  FROM pg_tables t
  LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies 
    GROUP BY tablename
  ) p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 6: CREATE USER VERIFICATION FUNCTION
-- =============================================================================

-- Function to verify user roles and permissions
CREATE OR REPLACE FUNCTION verify_user_setup()
RETURNS TABLE(
  email TEXT,
  role TEXT,
  is_super_admin BOOLEAN,
  created_at TIMESTAMPTZ,
  user_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.email::TEXT,
    u.role::TEXT,
    u.is_super_admin,
    u.created_at,
    CASE 
      WHEN u.email = 'system@quotemaster.pro' THEN 'SYSTEM'
      WHEN u.role = 'admin' AND u.is_super_admin THEN 'SUPER_ADMIN'
      WHEN u.role = 'admin' THEN 'ADMIN'
      ELSE 'USER'
    END::TEXT
  FROM users u
  ORDER BY u.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 7: RUN VERIFICATION
-- =============================================================================

-- Check RLS policies
DO $$
DECLARE
  policy_check RECORD;
  issues_found INTEGER := 0;
BEGIN
  RAISE NOTICE '=== RLS POLICY VERIFICATION ===';
  
  FOR policy_check IN SELECT * FROM verify_rls_policies() LOOP
    IF policy_check.status != 'OK' THEN
      RAISE WARNING 'Table %: % (% policies)', 
        policy_check.table_name, policy_check.status, policy_check.policy_count;
      issues_found := issues_found + 1;
    ELSE
      RAISE NOTICE 'Table %: OK (% policies)', 
        policy_check.table_name, policy_check.policy_count;
    END IF;
  END LOOP;
  
  IF issues_found = 0 THEN
    RAISE NOTICE 'All RLS policies are properly configured!';
  ELSE
    RAISE WARNING 'Found % tables with RLS issues', issues_found;
  END IF;
END $$;

-- Check user setup
DO $$
DECLARE
  user_check RECORD;
  admin_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== USER SETUP VERIFICATION ===';
  
  FOR user_check IN SELECT * FROM verify_user_setup() LOOP
    RAISE NOTICE 'User %: % (%)', 
      user_check.email, user_check.user_type, user_check.created_at;
    
    IF user_check.user_type IN ('ADMIN', 'SUPER_ADMIN') AND user_check.email != 'system@quotemaster.pro' THEN
      admin_count := admin_count + 1;
    END IF;
  END LOOP;
  
  IF admin_count = 1 THEN
    RAISE NOTICE 'User setup is correct: exactly 1 real admin user';
  ELSE
    RAISE WARNING 'User setup issue: found % real admin users (should be 1)', admin_count;
  END IF;
END $$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== COMPREHENSIVE FIX COMPLETED ===';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '1. Admin role assignment trigger corrected';
  RAISE NOTICE '2. User roles reset (only first real user is admin)';
  RAISE NOTICE '3. All RLS policies updated and verified';
  RAISE NOTICE '4. Authentication issues should be resolved';
  RAISE NOTICE '5. Quote creation should now work';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test user registration (should create regular user)';
  RAISE NOTICE '2. Test quote creation (should work for all users)';
  RAISE NOTICE '3. Test admin dashboard access (only for admin)';
END $$;
