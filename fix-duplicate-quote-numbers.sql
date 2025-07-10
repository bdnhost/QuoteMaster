-- QuoteMaster Pro - Fix Duplicate Quote Numbers
-- Run this to clean up duplicate quote numbers and prevent future conflicts

-- =============================================================================
-- STEP 1: IDENTIFY DUPLICATE QUOTE NUMBERS
-- =============================================================================

-- Find duplicate quote numbers
SELECT 
  quote_number,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as quote_ids
FROM quotes 
GROUP BY quote_number 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =============================================================================
-- STEP 2: FIX DUPLICATE QUOTE NUMBERS
-- =============================================================================

-- Update duplicate quote numbers to make them unique
DO $$
DECLARE
  quote_record RECORD;
  new_quote_number TEXT;
  counter INTEGER;
BEGIN
  RAISE NOTICE 'Starting duplicate quote number cleanup...';
  
  -- Loop through all quotes with duplicate numbers
  FOR quote_record IN 
    SELECT 
      id,
      quote_number,
      user_id,
      created_at,
      ROW_NUMBER() OVER (PARTITION BY quote_number ORDER BY created_at) as rn
    FROM quotes
    WHERE quote_number IN (
      SELECT quote_number 
      FROM quotes 
      GROUP BY quote_number 
      HAVING COUNT(*) > 1
    )
    ORDER BY quote_number, created_at
  LOOP
    -- Keep the first occurrence, rename the others
    IF quote_record.rn > 1 THEN
      -- Generate new unique quote number
      new_quote_number := quote_record.quote_number || '-DUP-' || quote_record.rn::text;
      
      -- Make sure this new number doesn't exist
      WHILE EXISTS (SELECT 1 FROM quotes WHERE quote_number = new_quote_number) LOOP
        new_quote_number := quote_record.quote_number || '-DUP-' || quote_record.rn::text || '-' || EXTRACT(EPOCH FROM NOW())::text;
      END LOOP;
      
      -- Update the quote
      UPDATE quotes 
      SET quote_number = new_quote_number 
      WHERE id = quote_record.id;
      
      RAISE NOTICE 'Updated quote % from % to %', 
        quote_record.id, 
        quote_record.quote_number, 
        new_quote_number;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Duplicate quote number cleanup completed';
END $$;

-- =============================================================================
-- STEP 3: VERIFY NO MORE DUPLICATES
-- =============================================================================

-- Check that no duplicates remain
SELECT 
  quote_number,
  COUNT(*) as count
FROM quotes 
GROUP BY quote_number 
HAVING COUNT(*) > 1;

-- If this returns no rows, the cleanup was successful

-- =============================================================================
-- STEP 4: CREATE FUNCTION TO GENERATE UNIQUE QUOTE NUMBERS
-- =============================================================================

-- Create a safer quote number generation function
CREATE OR REPLACE FUNCTION generate_unique_quote_number(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_number TEXT;
  final_number TEXT;
  counter INTEGER := 1;
  year_month TEXT;
BEGIN
  -- Get current year and month
  year_month := TO_CHAR(NOW(), 'YYYYMM');
  
  -- Get the next number for this user in this month
  SELECT COALESCE(MAX(
    CASE 
      WHEN quote_number ~ ('^' || year_month || '-[0-9]+') 
      THEN (regexp_split_to_array(quote_number, '-'))[2]::INTEGER 
      ELSE 0 
    END
  ), 0) + 1
  INTO counter
  FROM quotes 
  WHERE user_id = p_user_id 
  AND quote_number LIKE year_month || '-%';
  
  -- Create base number
  base_number := year_month || '-' || LPAD(counter::TEXT, 3, '0');
  final_number := base_number;
  
  -- Ensure uniqueness across all users (just in case)
  WHILE EXISTS (SELECT 1 FROM quotes WHERE quote_number = final_number) LOOP
    counter := counter + 1;
    final_number := year_month || '-' || LPAD(counter::TEXT, 3, '0');
  END LOOP;
  
  RETURN final_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 5: CREATE TRIGGER TO AUTO-GENERATE QUOTE NUMBERS
-- =============================================================================

-- Function to auto-generate quote numbers on insert
CREATE OR REPLACE FUNCTION auto_generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if quote_number is not provided or is empty
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := generate_unique_quote_number(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS auto_quote_number_trigger ON quotes;
CREATE TRIGGER auto_quote_number_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_quote_number();

-- =============================================================================
-- STEP 6: TEST THE NEW SYSTEM
-- =============================================================================

-- Test the quote number generation
DO $$
DECLARE
  test_user_id UUID;
  test_quote_id UUID;
  generated_number TEXT;
BEGIN
  -- Get a test user (or use current auth user)
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the function directly
    SELECT generate_unique_quote_number(test_user_id) INTO generated_number;
    RAISE NOTICE 'Generated quote number: %', generated_number;
    
    -- Test with actual insert (will be cleaned up)
    INSERT INTO quotes (user_id, client_name, status, total_amount)
    VALUES (test_user_id, 'Test Client', 'draft', 0)
    RETURNING id, quote_number INTO test_quote_id, generated_number;
    
    RAISE NOTICE 'Auto-generated quote number on insert: %', generated_number;
    
    -- Clean up test quote
    DELETE FROM quotes WHERE id = test_quote_id;
    RAISE NOTICE 'Test quote cleaned up';
  ELSE
    RAISE NOTICE 'No users found for testing';
  END IF;
END $$;

-- =============================================================================
-- STEP 7: UPDATE EXISTING QUOTES WITH PROPER NUMBERS
-- =============================================================================

-- Update any quotes that might have malformed numbers
DO $$
DECLARE
  quote_record RECORD;
  new_number TEXT;
BEGIN
  RAISE NOTICE 'Updating malformed quote numbers...';
  
  FOR quote_record IN 
    SELECT id, user_id, quote_number, created_at
    FROM quotes 
    WHERE quote_number !~ '^[0-9]{6}-[0-9]{3}' -- Not in YYYYMM-XXX format
    ORDER BY created_at
  LOOP
    -- Generate new proper number
    new_number := generate_unique_quote_number(quote_record.user_id);
    
    UPDATE quotes 
    SET quote_number = new_number 
    WHERE id = quote_record.id;
    
    RAISE NOTICE 'Updated quote % from % to %', 
      quote_record.id, 
      quote_record.quote_number, 
      new_number;
  END LOOP;
  
  RAISE NOTICE 'Malformed quote number update completed';
END $$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== QUOTE NUMBER SYSTEM FIXED ===';
  RAISE NOTICE 'Completed tasks:';
  RAISE NOTICE '1. Cleaned up duplicate quote numbers';
  RAISE NOTICE '2. Created unique quote number generation function';
  RAISE NOTICE '3. Added auto-generation trigger';
  RAISE NOTICE '4. Updated malformed quote numbers';
  RAISE NOTICE '5. Tested the new system';
  RAISE NOTICE '';
  RAISE NOTICE 'Quote numbers now follow format: YYYYMM-XXX';
  RAISE NOTICE 'Example: 202412-001, 202412-002, etc.';
  RAISE NOTICE '';
  RAISE NOTICE 'The system will now automatically generate unique quote numbers!';
END $$;
