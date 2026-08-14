-- Create a new celebrity user account with credentials
-- First, let's check if we have any celebrity profiles
DO $$
DECLARE
    new_user_id UUID;
    new_profile_id UUID;
    celebrity_id UUID;
BEGIN
    -- Insert a new user with known credentials (this simulates user signup)
    -- Note: In real app, this would be done through Supabase Auth signup
    -- For demo purposes, we'll create a profile entry that represents a celebrity
    
    -- Generate a UUID for the simulated user
    new_user_id := gen_random_uuid();
    
    -- Create a profile for the celebrity
    INSERT INTO profiles (
        user_id, 
        email, 
        first_name, 
        last_name, 
        role,
        referral_code
    ) VALUES (
        new_user_id,
        'celebrity@example.com',
        'Demo',
        'Celebrity',
        'user',
        generate_referral_code()
    ) RETURNING id INTO new_profile_id;
    
    -- Create the celebrity entry
    INSERT INTO celebrities (
        profile_id,
        name,
        category,
        bio,
        location,
        general_wish_price,
        image_promotion_price,
        video_promotion_price,
        followers,
        is_verified,
        is_active,
        commission_percentage,
        image_url
    ) VALUES (
        new_profile_id,
        'Demo Celebrity',
        'Actor',
        'A demo celebrity account for testing purposes.',
        'Mumbai, India',
        5000,
        15000,
        25000,
        '100K+',
        true,
        true,
        70,
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    ) RETURNING id INTO celebrity_id;
    
    -- Add some sample events for this celebrity
    INSERT INTO celebrity_events (
        celebrity_id,
        title,
        event_date,
        event_type,
        location,
        description,
        is_public
    ) VALUES 
    (celebrity_id, 'Movie Premiere', CURRENT_DATE + INTERVAL '30 days', 'premiere', 'Mumbai', 'Upcoming movie premiere event', true),
    (celebrity_id, 'Fan Meet', CURRENT_DATE + INTERVAL '15 days', 'fan-meet', 'Delhi', 'Meeting fans and signing autographs', true);
    
    -- Add some sample media
    INSERT INTO celebrity_media (
        celebrity_id,
        title,
        media_type,
        file_url,
        description,
        is_public,
        is_promotional
    ) VALUES 
    (celebrity_id, 'Profile Photo', 'image', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', 'Main profile photo', true, false),
    (celebrity_id, 'Behind the Scenes', 'video', 'https://example.com/sample-video.mp4', 'Behind the scenes footage', true, true);
    
    RAISE NOTICE 'Created demo celebrity with email: celebrity@example.com';
    RAISE NOTICE 'Celebrity ID: %', celebrity_id;
    RAISE NOTICE 'Profile ID: %', new_profile_id;
    RAISE NOTICE 'User ID: %', new_user_id;
END $$;