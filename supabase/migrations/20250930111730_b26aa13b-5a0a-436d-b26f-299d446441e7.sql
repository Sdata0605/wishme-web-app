-- Update the user role to celebrity
UPDATE profiles 
SET role = 'celebrity' 
WHERE email = 'celebrity@demo.com';

-- Create a celebrity profile for this user
INSERT INTO celebrities (
  profile_id,
  name,
  category,
  bio,
  location,
  is_active,
  is_verified,
  general_wish_price,
  image_promotion_price,
  video_promotion_price
) VALUES (
  (SELECT id FROM profiles WHERE email = 'celebrity@demo.com'),
  'John Doe',
  'Entertainment',
  'Demo celebrity account for testing',
  'Mumbai, India',
  true,
  true,
  500,
  10000,
  50000
);