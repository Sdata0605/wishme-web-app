CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  created_at timestamptz,
  plan text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.first_name, p.last_name, p.email, p.created_at, p.plan::text
  FROM public.profiles p
  WHERE p.referred_by = (
    SELECT pp.id FROM public.profiles pp WHERE pp.user_id = auth.uid() LIMIT 1
  )
  ORDER BY p.created_at DESC;
$$;