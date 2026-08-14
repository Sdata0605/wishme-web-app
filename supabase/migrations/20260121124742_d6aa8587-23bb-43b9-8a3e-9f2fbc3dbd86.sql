-- =====================================================
-- FIX: Security Definer View Issue
-- Drop view with SECURITY DEFINER and recreate with SECURITY INVOKER
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS public_profile_basic;

-- Recreate with explicit SECURITY INVOKER (default, but being explicit)
-- This ensures RLS policies of the QUERYING user are enforced, not the view creator
CREATE VIEW public_profile_basic 
WITH (security_invoker = true)
AS
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

-- Re-grant access to the view
GRANT SELECT ON public_profile_basic TO anon, authenticated;

-- Add a comment explaining the view's purpose
COMMENT ON VIEW public_profile_basic IS 'Safe public view of profile data - exposes only non-sensitive fields for referral lookups and celebrity discovery';