-- Temporarily assign the existing celebrity profile to all celebrities without profile_id
-- This allows messages to work while proper auth accounts are created

UPDATE celebrities 
SET profile_id = '673cadc0-f874-4b66-80b8-b81864220ad1'
WHERE profile_id IS NULL;