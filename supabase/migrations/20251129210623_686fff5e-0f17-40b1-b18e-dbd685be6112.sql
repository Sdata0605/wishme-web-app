-- Clean broken media_library records that don't have proper file keys
-- This removes records where file_key doesn't start with http (legacy B2 paths that no longer exist)
-- and also records pointing to non-existent Supabase Storage URLs

DELETE FROM media_library
WHERE 
  -- Remove records with invalid B2 paths (not full URLs)
  (file_key NOT LIKE 'http%' AND file_key NOT LIKE 'banner/%' AND file_key NOT LIKE 'featured/%')
  OR
  -- Remove records with broken Supabase Storage URLs
  (file_key LIKE '%supabase.co%' AND category IN ('banner', 'featured'));

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleaned up broken media_library records. Admin can now upload fresh videos to Backblaze B2.';
END $$;
