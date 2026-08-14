-- Insert test user accounts (these will need to be created through auth signup)
-- For now, let's create a temporary admin account that can be used

-- First, let's check if we can create some sample profiles that will be linked when users sign up
-- We'll create these with placeholder user_ids that will be updated when real auth users are created

-- Create a function to handle admin user creation
CREATE OR REPLACE FUNCTION public.create_admin_user()
RETURNS void AS $$
BEGIN
  -- This function will be called to set up the first admin user
  -- It will update the first user that signs up to be an admin
  NULL;
END;
$$ LANGUAGE plpgsql;

-- Let's also add a way to manually set a user as admin
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE email = user_email;
END;
$$ LANGUAGE plpgsql;