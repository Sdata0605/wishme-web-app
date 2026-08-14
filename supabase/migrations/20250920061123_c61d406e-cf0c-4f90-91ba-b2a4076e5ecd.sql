-- Assign roles to known test users
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@wishme.com';
UPDATE public.profiles SET role = 'user' WHERE email = 'user@wishme.com';
-- If 'celebrity' is part of user_role enum, set it for the celebrity account
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'celebrity') THEN
    UPDATE public.profiles SET role = 'celebrity' WHERE email = 'celebrity@wishme.com';
  ELSE
    -- fallback to user role if celebrity not present
    UPDATE public.profiles SET role = 'user' WHERE email = 'celebrity@wishme.com';
  END IF;
END $$;