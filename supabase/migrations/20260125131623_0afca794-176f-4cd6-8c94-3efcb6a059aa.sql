-- Fix RLS policies with overly permissive expressions

-- Drop the problematic policies
DROP POLICY IF EXISTS "System can manage abandoned carts" ON public.abandoned_cart_tracking;
DROP POLICY IF EXISTS "System can insert message logs" ON public.message_logs;

-- Recreate with proper security
CREATE POLICY "Service role can insert message logs"
ON public.message_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

CREATE POLICY "Admins can manage abandoned carts"
ON public.abandoned_cart_tracking FOR ALL
TO authenticated
USING (public.is_admin_by_auth_uid())
WITH CHECK (public.is_admin_by_auth_uid());

CREATE POLICY "Users can insert own abandoned carts"
ON public.abandoned_cart_tracking FOR INSERT
TO authenticated
WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Users can update own abandoned carts"
ON public.abandoned_cart_tracking FOR UPDATE
TO authenticated
USING (user_id = public.get_my_profile_id());