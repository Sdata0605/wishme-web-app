-- Update storage policies for greeting-card-uploads to be more flexible
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can upload their own greeting cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own greeting cards" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view greeting cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own greeting cards" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own greeting cards" ON storage.objects;

-- Create new, more flexible policies
-- Allow authenticated users to upload to greeting-card-uploads bucket
CREATE POLICY "Authenticated users can upload greeting cards"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'greeting-card-uploads');

-- Allow authenticated users to view files in greeting-card-uploads
CREATE POLICY "Authenticated users can view greeting cards"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'greeting-card-uploads');

-- Allow public viewing since bucket is public
CREATE POLICY "Public can view greeting cards"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'greeting-card-uploads');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update greeting cards"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'greeting-card-uploads');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete greeting cards"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'greeting-card-uploads');