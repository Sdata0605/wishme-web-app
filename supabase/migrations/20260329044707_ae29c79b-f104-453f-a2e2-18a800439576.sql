-- Fix SELECT policy
DROP POLICY IF EXISTS "Users can view their own photo wishes" ON public.photo_wishes;
CREATE POLICY "Users can view their own photo wishes"
  ON public.photo_wishes FOR SELECT
  USING (user_id = public.get_my_profile_id());

-- Fix INSERT policy
DROP POLICY IF EXISTS "Users can insert their own photo wishes" ON public.photo_wishes;
CREATE POLICY "Users can insert their own photo wishes"
  ON public.photo_wishes FOR INSERT
  WITH CHECK (user_id = public.get_my_profile_id());

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Users can update their own photo wishes" ON public.photo_wishes;
CREATE POLICY "Users can update their own photo wishes"
  ON public.photo_wishes FOR UPDATE
  USING (user_id = public.get_my_profile_id());