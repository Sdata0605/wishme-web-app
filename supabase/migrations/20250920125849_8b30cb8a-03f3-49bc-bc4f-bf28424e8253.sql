-- Fix the remaining function security warning
CREATE OR REPLACE FUNCTION public.create_admin_user()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  -- This function will be called to set up the first admin user
  -- It will update the first user that signs up to be an admin
  NULL;
END;
$function$;