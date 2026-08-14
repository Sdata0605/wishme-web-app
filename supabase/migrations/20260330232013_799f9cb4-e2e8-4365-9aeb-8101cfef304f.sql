-- Fix broken admin RLS policies on ugc_ads table

-- Drop the broken admin policy (uses profiles.id = auth.uid() which never matches)
DROP POLICY IF EXISTS "Admins can view all UGC ads" ON public.ugc_ads;

-- Recreate using the correct is_admin_by_auth_uid() helper
CREATE POLICY "Admins can view all UGC ads"
ON public.ugc_ads
FOR SELECT
TO authenticated
USING (public.is_admin_by_auth_uid());

-- Add admin UPDATE policy so admins can update UGC ad status
CREATE POLICY "Admins can update all UGC ads"
ON public.ugc_ads
FOR UPDATE
TO authenticated
USING (public.is_admin_by_auth_uid())
WITH CHECK (public.is_admin_by_auth_uid());
