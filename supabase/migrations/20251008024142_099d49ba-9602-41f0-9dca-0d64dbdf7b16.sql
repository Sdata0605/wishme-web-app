-- Make celebrity-avatars bucket public so avatars can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'celebrity-avatars';

-- Storage policies for celebrity-avatars (public bucket)
CREATE POLICY "Anyone can view celebrity avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'celebrity-avatars');

CREATE POLICY "Authenticated users can upload celebrity avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'celebrity-avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Owners can update their celebrity avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'celebrity-avatars' 
  AND auth.uid() = owner
);

CREATE POLICY "Owners can delete their celebrity avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'celebrity-avatars' 
  AND auth.uid() = owner
);

-- Storage policies for verification-docs (private bucket)
CREATE POLICY "Celebrities can upload their verification docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-docs' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Celebrities can view their own verification docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-docs' 
  AND auth.uid() = owner
);

CREATE POLICY "Admins can view all verification docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-docs' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
);