-- Enable RLS on storage.objects for greeting-card-uploads bucket
-- Allow authenticated users to upload their own files

-- Policy to allow users to upload their own greeting card files
CREATE POLICY "Users can upload their own greeting cards"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'greeting-card-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to view their own greeting card files
CREATE POLICY "Users can view their own greeting cards"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'greeting-card-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow public viewing of greeting card files (since bucket is public)
CREATE POLICY "Anyone can view greeting cards"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'greeting-card-uploads');

-- Policy to allow users to update their own greeting card files
CREATE POLICY "Users can update their own greeting cards"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'greeting-card-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete their own greeting card files
CREATE POLICY "Users can delete their own greeting cards"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'greeting-card-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);