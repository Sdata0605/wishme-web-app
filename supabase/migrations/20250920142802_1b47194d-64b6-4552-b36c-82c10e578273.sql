-- Create a celebrity with proper auth user
-- First, let's see what existing data we have
DO $$
BEGIN
    -- Display existing celebrities for admin reference
    RAISE NOTICE 'Existing celebrities:';
    
    FOR rec IN 
        SELECT c.name, c.id, p.email 
        FROM celebrities c 
        JOIN profiles p ON c.profile_id = p.id 
        LIMIT 5
    LOOP
        RAISE NOTICE 'Celebrity: %, ID: %, Email: %', rec.name, rec.id, rec.email;
    END LOOP;
    
    -- Create a note about celebrity login
    RAISE NOTICE 'NOTE: To test celebrity functionality, you need to:';
    RAISE NOTICE '1. Go to /auth and sign up with a new email (e.g., testcelebrity@example.com)';
    RAISE NOTICE '2. After signup, an admin needs to assign them to a celebrity profile';
    RAISE NOTICE '3. Or create a celebrity profile and link it to their user account';
    RAISE NOTICE 'Currently available celebrity for testing: Demo Celebrity';
END $$;