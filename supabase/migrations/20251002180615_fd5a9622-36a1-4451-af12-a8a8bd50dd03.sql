-- Note: Nalininh@gmail.com user check
-- To verify if nalininh@gmail.com is a celebrity, you can run:
-- SELECT p.email, p.role, c.* FROM profiles p 
-- LEFT JOIN celebrities c ON c.profile_id = p.id 
-- WHERE p.email = 'nalininh@gmail.com';

-- This migration creates nothing - just documenting the check
-- Run the above query in SQL editor to see if the user is a celebrity