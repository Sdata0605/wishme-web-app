-- Reset admin password by calling auth.admin API is not possible via SQL
-- Instead, we'll use a workaround: create a temporary function that uses the Supabase auth schema
-- Actually, we can't modify auth schema. Let's verify the user exists and check profile status.

-- Check the profile exists
SELECT p.id, p.email, p.role, p.user_id, ur.role as user_role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
WHERE p.email = 'admin@wishme.today';
