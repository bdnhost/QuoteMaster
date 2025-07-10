-- QuoteMaster Pro - Fix Missing RLS Policies
-- Run this to add missing RLS policies for file_uploads and quote_templates

-- =============================================================================
-- FILE_UPLOADS TABLE POLICIES
-- =============================================================================

-- Users can view their own files
CREATE POLICY "users_view_own_files" ON file_uploads FOR SELECT 
USING (auth.uid() = user_id);

-- Users can upload their own files
CREATE POLICY "users_upload_own_files" ON file_uploads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own files
CREATE POLICY "users_update_own_files" ON file_uploads FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "users_delete_own_files" ON file_uploads FOR DELETE 
USING (auth.uid() = user_id);

-- Anyone can view public files
CREATE POLICY "public_view_public_files" ON file_uploads FOR SELECT 
USING (is_public = true);

-- Admins can manage all files
CREATE POLICY "admins_manage_all_files" ON file_uploads FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =============================================================================
-- QUOTE_TEMPLATES TABLE POLICIES
-- =============================================================================

-- Users can view their own templates
CREATE POLICY "users_view_own_templates" ON quote_templates FOR SELECT 
USING (auth.uid() = user_id);

-- Users can view public templates
CREATE POLICY "users_view_public_templates" ON quote_templates FOR SELECT 
USING (is_public = true);

-- Users can create their own templates
CREATE POLICY "users_create_own_templates" ON quote_templates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "users_update_own_templates" ON quote_templates FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "users_delete_own_templates" ON quote_templates FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can manage all templates
CREATE POLICY "admins_manage_all_templates" ON quote_templates FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

-- =============================================================================
-- VERIFY POLICIES WERE CREATED
-- =============================================================================

-- Check that policies were created successfully
DO $$
DECLARE
  file_uploads_policies INTEGER;
  quote_templates_policies INTEGER;
BEGIN
  -- Count policies for file_uploads
  SELECT COUNT(*) INTO file_uploads_policies
  FROM pg_policies 
  WHERE tablename = 'file_uploads';
  
  -- Count policies for quote_templates
  SELECT COUNT(*) INTO quote_templates_policies
  FROM pg_policies 
  WHERE tablename = 'quote_templates';
  
  RAISE NOTICE 'file_uploads policies created: %', file_uploads_policies;
  RAISE NOTICE 'quote_templates policies created: %', quote_templates_policies;
  
  IF file_uploads_policies >= 6 AND quote_templates_policies >= 6 THEN
    RAISE NOTICE 'All RLS policies created successfully!';
  ELSE
    RAISE WARNING 'Some policies may not have been created properly';
  END IF;
END $$;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== RLS POLICIES FIX COMPLETED ===';
  RAISE NOTICE 'Added policies for file_uploads table';
  RAISE NOTICE 'Added policies for quote_templates table';
  RAISE NOTICE 'Both tables now have proper RLS protection';
  RAISE NOTICE '';
  RAISE NOTICE 'Security improvements:';
  RAISE NOTICE '- Users can only access their own files and templates';
  RAISE NOTICE '- Public templates/files are accessible to all';
  RAISE NOTICE '- Admins have full access to everything';
  RAISE NOTICE '- Proper data separation maintained';
END $$;
