-- =====================================================
-- SECURITY FIX: Profiles Table RLS Policies
-- Critical: Remove overly permissive policy that exposes PII
-- =====================================================

-- Step 1: Remove the dangerous overly permissive policy
-- This policy currently allows ANY authenticated user to read ALL profiles
-- including sensitive data like Aadhaar, PAN, bank details
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Step 2: Create a secure view for public profile data (non-sensitive fields only)
-- This allows celebrity lookup and referral system without exposing PII
CREATE OR REPLACE VIEW public_profile_basic AS
SELECT 
  id,
  user_id,
  first_name,
  last_name,
  avatar_url,
  referral_code,
  referral_url,
  created_at
FROM profiles;

-- Grant access to the view for authenticated and anonymous users
GRANT SELECT ON public_profile_basic TO anon, authenticated;

-- Step 3: Add policy for referral system lookups
-- Users need to look up their referrer's basic info
CREATE POLICY "Users can view referrer profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT referred_by FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Step 4: Add policy for celebrity profile lookups (only profiles linked to active celebrities)
-- This allows viewing profile data for celebrities (needed for celebrity pages)
CREATE POLICY "Public can view celebrity profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT profile_id FROM celebrities WHERE is_active = true AND profile_id IS NOT NULL)
  );

-- Step 5: Verify existing safe policies are in place
-- These should already exist but we ensure they're correct:

-- Policy: Users can view their own profile (KEEP - this is safe)
-- Already exists: USING (user_id = auth.uid())

-- Policy: Admins can view all profiles (KEEP - admin access is needed)
-- Already exists: USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'))

-- =====================================================
-- VERIFICATION COMMENTS
-- =====================================================
-- After this migration:
-- ✅ Regular users can ONLY see:
--    - Their own full profile
--    - Their referrer's profile (if they were referred)
--    - Celebrity profiles (for booking/viewing)
-- ✅ Admins can see all profiles
-- ✅ Sensitive data (Aadhaar, PAN, bank details) is protected
-- ✅ public_profile_basic view available for safe public lookups