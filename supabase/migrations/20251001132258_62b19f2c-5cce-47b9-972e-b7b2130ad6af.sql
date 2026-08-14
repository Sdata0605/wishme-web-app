-- Add INSERT policy for celebrities table to allow users to create their own celebrity profile
CREATE POLICY "Users can create their own celebrity profile" 
ON public.celebrities 
FOR INSERT 
TO authenticated
WITH CHECK (
  profile_id IN (
    SELECT p.id 
    FROM profiles p 
    WHERE p.user_id = auth.uid()
  )
);