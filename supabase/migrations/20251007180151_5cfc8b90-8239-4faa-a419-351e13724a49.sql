-- Fix storage policies for celebrity uploads

-- Drop existing restrictive policies on storage.objects
DROP POLICY IF EXISTS "Celebrity can upload avatar content" ON storage.objects;
DROP POLICY IF EXISTS "Celebrity can upload promotional content" ON storage.objects;

-- Allow celebrities to upload to celebrity-avatars bucket
CREATE POLICY "Celebrities can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'celebrity-avatars' 
  AND auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN celebrities c ON c.profile_id = p.id
    WHERE auth.uid() = p.user_id
  )
);

CREATE POLICY "Celebrities can read their own avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'celebrity-avatars'
  AND auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN celebrities c ON c.profile_id = p.id
    WHERE auth.uid() = p.user_id
  )
);

-- Allow celebrities to upload to promotional-content bucket
CREATE POLICY "Celebrities can upload promotional content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'promotional-content'
  AND auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN celebrities c ON c.profile_id = p.id
    WHERE auth.uid() = p.user_id
  )
);

CREATE POLICY "Celebrities can read their own promotional content"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'promotional-content'
  AND auth.uid() IN (
    SELECT p.user_id 
    FROM profiles p
    JOIN celebrities c ON c.profile_id = p.id
    WHERE auth.uid() = p.user_id
  )
);

-- Add referral_url column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_url text;

-- Create function to generate referral URL
CREATE OR REPLACE FUNCTION generate_referral_url(profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code text;
  base_url text;
BEGIN
  -- Get referral code for the profile
  SELECT referral_code INTO ref_code
  FROM profiles
  WHERE id = profile_id;
  
  -- Generate URL (you can customize this)
  base_url := 'https://yourapp.lovable.app/auth?ref=';
  
  RETURN base_url || ref_code;
END;
$$;

-- Update existing profiles with referral URLs
UPDATE profiles
SET referral_url = generate_referral_url(id)
WHERE referral_code IS NOT NULL AND referral_url IS NULL;

-- Create trigger to auto-generate referral URL on insert
CREATE OR REPLACE FUNCTION auto_generate_referral_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NOT NULL AND NEW.referral_url IS NULL THEN
    NEW.referral_url := generate_referral_url(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_referral_url ON profiles;
CREATE TRIGGER trigger_auto_referral_url
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_generate_referral_url();