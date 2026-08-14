-- Fix media_library RLS policies to avoid profiles table recursion

-- Drop the problematic admin policy
DROP POLICY IF EXISTS "Admin can manage all media" ON public.media_library;

-- Create a new admin policy using the security definer function
CREATE POLICY "Admin can manage all media"
ON public.media_library
FOR ALL
USING (public.is_admin_by_auth_uid());

-- The "Everyone can view active media" policy is fine, it just checks is_active = true