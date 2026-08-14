-- Add existing admin user to user_roles table
INSERT INTO public.user_roles (user_id, role)
VALUES ('7b508ed1-f26a-44a1-a09b-b72f9ff16f45', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;