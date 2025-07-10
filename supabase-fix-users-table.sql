-- QuoteMaster Pro - Fix Users Table Structure
-- Run this first to fix the users table structure

-- =============================================================================
-- STEP 1: CHECK AND ADD MISSING COLUMNS
-- =============================================================================

-- Check current users table structure
DO $$
DECLARE
  col_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== CHECKING USERS TABLE STRUCTURE ===';
  
  -- Check if is_super_admin column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'is_super_admin'
    AND table_schema = 'public'
  ) INTO col_exists;
  
  IF col_exists THEN
    RAISE NOTICE 'is_super_admin column already exists';
  ELSE
    RAISE NOTICE 'is_super_admin column is missing - will add it';
  END IF;
END $$;

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Update existing admin users to be super admin
UPDATE users 
SET is_super_admin = true 
WHERE role = 'admin' AND email != 'system@quotemaster.pro';

-- =============================================================================
-- STEP 2: VERIFY CURRENT USER STATE
-- =============================================================================

-- Show current users and their roles
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER;
  admin_users INTEGER;
  real_users INTEGER;
BEGIN
  RAISE NOTICE '=== CURRENT USER STATE ===';
  
  SELECT COUNT(*) INTO total_users FROM users;
  SELECT COUNT(*) INTO admin_users FROM users WHERE role = 'admin';
  SELECT COUNT(*) INTO real_users FROM users WHERE email != 'system@quotemaster.pro';
  
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Admin users: %', admin_users;
  RAISE NOTICE 'Real users (non-system): %', real_users;
  RAISE NOTICE '';
  RAISE NOTICE 'User details:';
  
  FOR user_record IN 
    SELECT email, role, is_super_admin, created_at 
    FROM users 
    ORDER BY created_at
  LOOP
    RAISE NOTICE '- %: % (super_admin: %) - %', 
      user_record.email, 
      user_record.role, 
      user_record.is_super_admin,
      user_record.created_at;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 3: FIX ADMIN ROLE ASSIGNMENT
-- =============================================================================

-- Drop and recreate the admin assignment function
DROP TRIGGER IF EXISTS make_first_user_admin_trigger ON users;
DROP FUNCTION IF EXISTS make_first_user_admin();

-- Create corrected function
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  real_user_count INTEGER;
BEGIN
  -- Count only real users (exclude system user and current user being inserted)
  SELECT COUNT(*) INTO real_user_count 
  FROM users 
  WHERE email != 'system@quotemaster.pro' 
  AND email != NEW.email;
  
  -- If this is the first real user, make them admin
  IF real_user_count = 0 AND NEW.email != 'system@quotemaster.pro' THEN
    NEW.role = 'admin';
    NEW.is_super_admin = true;
    RAISE NOTICE 'First real user % promoted to super admin', NEW.email;
  ELSE
    -- Ensure regular users stay regular users
    NEW.role = COALESCE(NEW.role, 'user');
    NEW.is_super_admin = COALESCE(NEW.is_super_admin, false);
    RAISE NOTICE 'User % created as regular user', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER make_first_user_admin_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION make_first_user_admin();

-- =============================================================================
-- STEP 4: RESET USER ROLES TO CORRECT STATE
-- =============================================================================

-- Fix existing users - only first real user should be admin
DO $$
DECLARE
  first_real_user_id UUID;
  user_record RECORD;
  fixed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== FIXING USER ROLES ===';
  
  -- Find the first real user (not system user)
  SELECT id INTO first_real_user_id
  FROM users 
  WHERE email != 'system@quotemaster.pro'
  ORDER BY created_at 
  LIMIT 1;
  
  IF first_real_user_id IS NULL THEN
    RAISE NOTICE 'No real users found - nothing to fix';
    RETURN;
  END IF;
  
  -- Reset all users except the first real user
  FOR user_record IN 
    SELECT id, email, role FROM users 
    WHERE email != 'system@quotemaster.pro'
  LOOP
    IF user_record.id = first_real_user_id THEN
      -- Ensure first user is admin
      IF user_record.role != 'admin' THEN
        UPDATE users 
        SET role = 'admin', is_super_admin = true 
        WHERE id = user_record.id;
        RAISE NOTICE 'Fixed: % promoted to super admin', user_record.email;
        fixed_count := fixed_count + 1;
      ELSE
        RAISE NOTICE 'Confirmed: % is already super admin', user_record.email;
      END IF;
    ELSE
      -- Make others regular users
      IF user_record.role != 'user' THEN
        UPDATE users 
        SET role = 'user', is_super_admin = false 
        WHERE id = user_record.id;
        RAISE NOTICE 'Fixed: % demoted to regular user', user_record.email;
        fixed_count := fixed_count + 1;
      ELSE
        RAISE NOTICE 'Confirmed: % is already regular user', user_record.email;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Fixed % user role assignments', fixed_count;
END $$;

-- =============================================================================
-- STEP 5: VERIFY THE FIX
-- =============================================================================

-- Final verification
DO $$
DECLARE
  user_record RECORD;
  admin_count INTEGER;
  super_admin_count INTEGER;
BEGIN
  RAISE NOTICE '=== FINAL VERIFICATION ===';
  
  SELECT COUNT(*) INTO admin_count 
  FROM users 
  WHERE role = 'admin' AND email != 'system@quotemaster.pro';
  
  SELECT COUNT(*) INTO super_admin_count 
  FROM users 
  WHERE is_super_admin = true AND email != 'system@quotemaster.pro';
  
  RAISE NOTICE 'Real admin users: %', admin_count;
  RAISE NOTICE 'Real super admin users: %', super_admin_count;
  
  IF admin_count = 1 AND super_admin_count = 1 THEN
    RAISE NOTICE 'SUCCESS: User roles are correctly configured!';
  ELSE
    RAISE WARNING 'ISSUE: Expected 1 admin and 1 super admin, found % admins and % super admins', 
      admin_count, super_admin_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Final user list:';
  FOR user_record IN 
    SELECT email, role, is_super_admin, created_at 
    FROM users 
    ORDER BY created_at
  LOOP
    RAISE NOTICE '- %: % (super_admin: %)', 
      user_record.email, 
      user_record.role, 
      user_record.is_super_admin;
  END LOOP;
END $$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== USERS TABLE FIX COMPLETED ===';
  RAISE NOTICE 'Added is_super_admin column';
  RAISE NOTICE 'Fixed admin role assignment trigger';
  RAISE NOTICE 'Reset user roles to correct state';
  RAISE NOTICE 'Only first real user should now be admin';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now run the comprehensive fix safely!';
END $$;
