-- Add admin role to the admin user
INSERT INTO public.user_roles (user_id, role)
VALUES ('7c18db4f-99dd-47b1-a32a-17c599e413ba', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Also update the profile role for consistency
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = '7c18db4f-99dd-47b1-a32a-17c599e413ba';
