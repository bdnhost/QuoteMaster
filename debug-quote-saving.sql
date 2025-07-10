-- QuoteMaster Pro - Debug Quote Saving Issues
-- Run this to diagnose quote saving problems

-- =============================================================================
-- STEP 1: CHECK CURRENT USER AND AUTHENTICATION
-- =============================================================================

-- Test current authentication
SELECT 
  auth.uid() as current_user_id,
  auth.uid() IS NOT NULL as is_authenticated;

-- Check if current user exists in users table
SELECT 
  id, 
  email, 
  role, 
  business_name,
  created_at
FROM users 
WHERE id = auth.uid();

-- =============================================================================
-- STEP 2: TEST QUOTE CREATION MANUALLY
-- =============================================================================

-- Try to create a test quote
DO $$
DECLARE
  test_quote_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;
  
  -- Try to insert a test quote
  INSERT INTO quotes (
    user_id,
    quote_number,
    client_name,
    client_email,
    status,
    total_amount,
    created_at,
    updated_at
  ) VALUES (
    current_user_id,
    'TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'Test Client',
    'test@example.com',
    'draft',
    100.00,
    NOW(),
    NOW()
  ) RETURNING id INTO test_quote_id;
  
  RAISE NOTICE 'Successfully created test quote with ID: %', test_quote_id;
  
  -- Clean up test quote
  DELETE FROM quotes WHERE id = test_quote_id;
  RAISE NOTICE 'Test quote cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating test quote: %', SQLERRM;
END $$;

-- =============================================================================
-- STEP 3: CHECK RLS POLICIES
-- =============================================================================

-- List all policies for quotes table
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quotes'
ORDER BY policyname;

-- List all policies for quote_items table
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'quote_items'
ORDER BY policyname;

-- =============================================================================
-- STEP 4: TEST RLS POLICIES
-- =============================================================================

-- Test SELECT policy
SELECT COUNT(*) as quote_count FROM quotes;

-- Test INSERT policy (this should work if authenticated)
EXPLAIN (ANALYZE, BUFFERS) 
INSERT INTO quotes (
  user_id,
  quote_number,
  client_name,
  status,
  total_amount
) VALUES (
  auth.uid(),
  'POLICY-TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  'Policy Test Client',
  'draft',
  50.00
);

-- =============================================================================
-- STEP 5: CHECK TABLE STRUCTURE
-- =============================================================================

-- Check quotes table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quotes' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check quote_items table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'quote_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================
-- STEP 6: CHECK CONSTRAINTS AND TRIGGERS
-- =============================================================================

-- Check foreign key constraints
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('quotes', 'quote_items');

-- Check triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('quotes', 'quote_items')
AND trigger_schema = 'public';

-- =============================================================================
-- STEP 7: TEST QUOTE CREATION FUNCTION
-- =============================================================================

-- Test the quote creation helper function if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_quote_with_items') THEN
    RAISE NOTICE 'Quote creation function exists - testing it';
    
    -- Test the function
    PERFORM create_quote_with_items(
      'FUNC-TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
      'Function Test Client',
      'functest@example.com',
      '123-456-7890',
      '123 Test St',
      'Test notes',
      CURRENT_DATE + INTERVAL '30 days',
      '[{"description": "Test Item", "quantity": 1, "unit_price": 100.00}]'::jsonb
    );
    
    RAISE NOTICE 'Quote creation function test completed successfully';
  ELSE
    RAISE NOTICE 'Quote creation function does not exist';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error testing quote creation function: %', SQLERRM;
END $$;

-- =============================================================================
-- STEP 8: SUMMARY
-- =============================================================================

DO $$
DECLARE
  user_count INTEGER;
  quote_count INTEGER;
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO quote_count FROM quotes;
  SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'quotes';
  
  RAISE NOTICE '=== QUOTE SAVING DIAGNOSIS SUMMARY ===';
  RAISE NOTICE 'Total users in system: %', user_count;
  RAISE NOTICE 'Total quotes in system: %', quote_count;
  RAISE NOTICE 'RLS policies for quotes: %', policy_count;
  RAISE NOTICE 'Current user authenticated: %', auth.uid() IS NOT NULL;
  
  IF auth.uid() IS NOT NULL THEN
    RAISE NOTICE 'Current user ID: %', auth.uid();
  ELSE
    RAISE NOTICE 'WARNING: No authenticated user - this may be the problem!';
  END IF;
END $$;
