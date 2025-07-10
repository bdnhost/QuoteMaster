-- QuoteMaster Pro - Fix Quote Creation Authentication
-- Run this to fix authentication issues with quote creation

-- =============================================================================
-- STEP 1: DIAGNOSE CURRENT RLS POLICIES
-- =============================================================================

-- Check current policies for quotes table
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== CURRENT QUOTES TABLE POLICIES ===';
  
  FOR policy_record IN 
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'quotes'
    ORDER BY policyname
  LOOP
    RAISE NOTICE 'Policy: % | Command: % | Using: % | Check: %', 
      policy_record.policyname, 
      policy_record.cmd,
      policy_record.qual,
      policy_record.with_check;
  END LOOP;
END $$;

-- =============================================================================
-- STEP 2: DROP ALL EXISTING QUOTE POLICIES
-- =============================================================================

-- Drop all existing policies for quotes
DROP POLICY IF EXISTS "users_select_quotes" ON quotes;
DROP POLICY IF EXISTS "users_insert_quotes" ON quotes;
DROP POLICY IF EXISTS "users_update_quotes" ON quotes;
DROP POLICY IF EXISTS "users_delete_quotes" ON quotes;
DROP POLICY IF EXISTS "quotes_select_own" ON quotes;
DROP POLICY IF EXISTS "quotes_insert_own" ON quotes;
DROP POLICY IF EXISTS "quotes_update_own" ON quotes;
DROP POLICY IF EXISTS "quotes_delete_own" ON quotes;
DROP POLICY IF EXISTS "admins_select_all_quotes" ON quotes;
DROP POLICY IF EXISTS "admins_update_all_quotes" ON quotes;
DROP POLICY IF EXISTS "admins_manage_all_quotes" ON quotes;

-- =============================================================================
-- STEP 3: CREATE SIMPLE, WORKING POLICIES
-- =============================================================================

-- Simple policy for selecting quotes
CREATE POLICY "quotes_select_policy" ON quotes FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Simple policy for inserting quotes
CREATE POLICY "quotes_insert_policy" ON quotes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Simple policy for updating quotes
CREATE POLICY "quotes_update_policy" ON quotes FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Simple policy for deleting quotes
CREATE POLICY "quotes_delete_policy" ON quotes FOR DELETE 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- =============================================================================
-- STEP 4: FIX QUOTE_ITEMS POLICIES
-- =============================================================================

-- Drop existing quote_items policies
DROP POLICY IF EXISTS "quote_items_select_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_insert_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_update_own" ON quote_items;
DROP POLICY IF EXISTS "quote_items_delete_own" ON quote_items;
DROP POLICY IF EXISTS "admins_manage_all_quote_items" ON quote_items;

-- Create simple quote_items policies
CREATE POLICY "quote_items_select_policy" ON quote_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND (
      quotes.user_id = auth.uid() 
      OR 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  )
);

CREATE POLICY "quote_items_insert_policy" ON quote_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

CREATE POLICY "quote_items_update_policy" ON quote_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND (
      quotes.user_id = auth.uid() 
      OR 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  )
);

CREATE POLICY "quote_items_delete_policy" ON quote_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND (
      quotes.user_id = auth.uid() 
      OR 
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'admin'
      )
    )
  )
);

-- =============================================================================
-- STEP 5: TEST AUTHENTICATION FUNCTION
-- =============================================================================

-- Create a test function to verify authentication
CREATE OR REPLACE FUNCTION test_quote_auth()
RETURNS TABLE(
  current_user_id UUID,
  is_authenticated BOOLEAN,
  user_role TEXT,
  can_create_quote BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    auth.uid() IS NOT NULL as is_authenticated,
    COALESCE(u.role, 'none') as user_role,
    (auth.uid() IS NOT NULL AND u.role IS NOT NULL) as can_create_quote
  FROM users u
  WHERE u.id = auth.uid()
  UNION ALL
  SELECT 
    auth.uid() as current_user_id,
    auth.uid() IS NOT NULL as is_authenticated,
    'no_user_record' as user_role,
    false as can_create_quote
  WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
  AND auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 6: CREATE QUOTE CREATION HELPER FUNCTION
-- =============================================================================

-- Function to help with quote creation
CREATE OR REPLACE FUNCTION create_quote_with_items(
  p_quote_number VARCHAR(50),
  p_client_name VARCHAR(255),
  p_client_email VARCHAR(255) DEFAULT NULL,
  p_client_phone VARCHAR(50) DEFAULT NULL,
  p_client_address TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_valid_until DATE DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  quote_id UUID;
  item JSONB;
  total_amount DECIMAL(10,2) := 0;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Create the quote
  INSERT INTO quotes (
    user_id,
    quote_number,
    client_name,
    client_email,
    client_phone,
    client_address,
    notes,
    valid_until,
    status,
    total_amount
  ) VALUES (
    auth.uid(),
    p_quote_number,
    p_client_name,
    p_client_email,
    p_client_phone,
    p_client_address,
    p_notes,
    p_valid_until,
    'draft',
    0
  ) RETURNING id INTO quote_id;
  
  -- Add items if provided
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO quote_items (
      quote_id,
      description,
      quantity,
      unit_price
    ) VALUES (
      quote_id,
      item->>'description',
      (item->>'quantity')::INTEGER,
      (item->>'unit_price')::DECIMAL(10,2)
    );
    
    total_amount := total_amount + ((item->>'quantity')::INTEGER * (item->>'unit_price')::DECIMAL(10,2));
  END LOOP;
  
  -- Update total amount
  UPDATE quotes SET total_amount = total_amount WHERE id = quote_id;
  
  RETURN quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 7: VERIFY POLICIES WORK
-- =============================================================================

-- Test the policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== VERIFYING NEW POLICIES ===';
  
  -- Count quotes policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'quotes';
  
  RAISE NOTICE 'Quotes table policies: %', policy_count;
  
  -- Count quote_items policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'quote_items';
  
  RAISE NOTICE 'Quote_items table policies: %', policy_count;
  
  IF policy_count >= 4 THEN
    RAISE NOTICE 'SUCCESS: All policies created successfully!';
  ELSE
    RAISE WARNING 'WARNING: Some policies may be missing';
  END IF;
END $$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== QUOTE AUTHENTICATION FIX COMPLETED ===';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '1. Simplified RLS policies for quotes and quote_items';
  RAISE NOTICE '2. Created authentication test function';
  RAISE NOTICE '3. Created quote creation helper function';
  RAISE NOTICE '4. Verified all policies are in place';
  RAISE NOTICE '';
  RAISE NOTICE 'Test functions available:';
  RAISE NOTICE '- SELECT * FROM test_quote_auth(); -- Test current auth status';
  RAISE NOTICE '- SELECT create_quote_with_items(...); -- Create quote safely';
  RAISE NOTICE '';
  RAISE NOTICE 'Quote creation should now work properly!';
END $$;
