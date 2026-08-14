-- Insert diverse Indian celebrities with complete data
-- First, clear existing sample data
DELETE FROM celebrity_media WHERE celebrity_id IN (SELECT id FROM celebrities);
DELETE FROM celebrity_occasions WHERE celebrity_id IN (SELECT id FROM celebrities);
DELETE FROM celebrity_events WHERE celebrity_id IN (SELECT id FROM celebrities);
DELETE FROM celebrity_reviews WHERE celebrity_id IN (SELECT id FROM celebrities);
DELETE FROM celebrities;

-- Insert celebrities with all details
INSERT INTO celebrities (
  name, category, bio, location, followers, image_url, rating, review_count,
  is_verified, is_active, verification_status, service_prices, delivery_time,
  date_of_birth, anniversary_date, commission_percentage
) VALUES
-- Actors & Actresses
('Shah Rukh Khan', 'Actor', 'Bollywood King Khan with 30+ years of iconic performances. Winner of 14 Filmfare Awards and global icon.', 
 'Mumbai, Maharashtra', '42M+', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&q=80',
 4.9, 2834, true, true, 'approved', 
 '{"general_wish": 50000, "text_message": 20000, "image_promotion": 250000, "video_promotion": 500000}'::jsonb,
 '24-48 hours', '1965-11-02', '1991-10-25', 70),

('Priyanka Chopra', 'Actress', 'Global icon, actress and producer. Former Miss World 2000 and UNICEF Goodwill Ambassador.',
 'Mumbai, Maharashtra', '85M+', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop&q=80',
 4.8, 2145, true, true, 'approved',
 '{"general_wish": 60000, "text_message": 25000, "image_promotion": 300000, "video_promotion": 600000}'::jsonb,
 '48-72 hours', '1982-07-18', '2018-12-01', 70),

('Deepika Padukone', 'Actress', 'Award-winning actress and mental health advocate. Winner of 3 Filmfare Awards and Padma Shri awardee.',
 'Bangalore, Karnataka', '70M+', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&h=800&fit=crop&q=80',
 4.9, 1987, true, true, 'approved',
 '{"general_wish": 55000, "text_message": 22000, "image_promotion": 275000, "video_promotion": 550000}'::jsonb,
 '24-48 hours', '1986-01-05', '2018-11-14', 70),

('Alia Bhatt', 'Actress', 'National Award-winning actress and producer. Known for versatile roles and powerful performances.',
 'Mumbai, Maharashtra', '78M+', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop&q=80',
 4.8, 1876, true, true, 'approved',
 '{"general_wish": 48000, "text_message": 19000, "image_promotion": 225000, "video_promotion": 475000}'::jsonb,
 '24-48 hours', '1993-03-15', '2022-04-14', 70),

('Ranveer Singh', 'Actor', 'Energetic actor known for versatile performances and bold fashion. Winner of 4 Filmfare Awards.',
 'Mumbai, Maharashtra', '45M+', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&h=800&fit=crop&q=80',
 4.7, 1654, true, true, 'approved',
 '{"general_wish": 52000, "text_message": 21000, "image_promotion": 260000, "video_promotion": 520000}'::jsonb,
 '24-48 hours', '1985-07-06', '2018-11-14', 70),

('Kareena Kapoor Khan', 'Actress', 'Bollywood royalty with 2+ decades of iconic performances. Known as Bebo, winner of 6 Filmfare Awards.',
 'Mumbai, Maharashtra', '55M+', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&h=800&fit=crop&q=80',
 4.8, 1789, true, true, 'approved',
 '{"general_wish": 50000, "text_message": 20000, "image_promotion": 250000, "video_promotion": 500000}'::jsonb,
 '48-72 hours', '1980-09-21', '2012-10-16', 70),

('Pankaj Tripathi', 'Actor', 'National Award-winning character actor known for authentic performances in films and web series.',
 'Mumbai, Maharashtra', '8M+', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=800&h=800&fit=crop&q=80',
 4.9, 876, true, true, 'approved',
 '{"general_wish": 25000, "text_message": 10000, "image_promotion": 100000, "video_promotion": 200000}'::jsonb,
 '12-24 hours', '1976-09-05', '2004-01-15', 70),

('Katrina Kaif', 'Actress', 'Bollywood superstar and entrepreneur. Founder of Kay Beauty cosmetics and fitness icon.',
 'Mumbai, Maharashtra', '75M+', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&h=800&fit=crop&q=80',
 4.8, 2198, true, true, 'approved',
 '{"general_wish": 55000, "text_message": 23000, "image_promotion": 280000, "video_promotion": 560000}'::jsonb,
 '48-72 hours', '1983-07-16', '2021-12-09', 70),

('Vicky Kaushal', 'Actor', 'National Award-winning actor known for powerful performances. Rising star of Bollywood.',
 'Mumbai, Maharashtra', '18M+', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&h=800&fit=crop&q=80',
 4.8, 789, true, true, 'approved',
 '{"general_wish": 38000, "text_message": 15000, "image_promotion": 170000, "video_promotion": 340000}'::jsonb,
 '24-48 hours', '1988-05-16', '2021-12-09', 70),

-- Cricketers
('Virat Kohli', 'Cricketer', 'Former Indian cricket captain and batting legend. Highest run-scorer in T20I cricket history.',
 'Delhi', '250M+', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop&q=80',
 4.9, 3245, true, true, 'approved',
 '{"general_wish": 100000, "text_message": 40000, "image_promotion": 500000, "video_promotion": 1000000}'::jsonb,
 '72-96 hours', '1988-11-05', '2017-12-11', 75),

('MS Dhoni', 'Cricketer', 'Captain Cool, former Indian cricket captain. Led India to 2011 World Cup victory and multiple IPL titles.',
 'Ranchi, Jharkhand', '45M+', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=800&fit=crop&q=80',
 5.0, 2567, true, true, 'approved',
 '{"general_wish": 80000, "text_message": 35000, "image_promotion": 400000, "video_promotion": 800000}'::jsonb,
 '72-96 hours', '1981-07-07', '2010-07-04', 75),

-- Music & Entertainment
('A.R. Rahman', 'Music Composer', 'Oscar-winning composer, the Mozart of Madras. Won 2 Academy Awards, 2 Grammy Awards, and Padma Bhushan.',
 'Chennai, Tamil Nadu', '35M+', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80',
 5.0, 1456, true, true, 'approved',
 '{"general_wish": 70000, "text_message": 30000, "image_promotion": 350000, "video_promotion": 700000}'::jsonb,
 '48-72 hours', '1967-01-06', '1995-03-12', 75),

('Shreya Ghoshal', 'Singer', 'Playback singing sensation with 4 National Film Awards and multiple international accolades.',
 'Mumbai, Maharashtra', '28M+', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop&q=80',
 4.9, 1234, true, true, 'approved',
 '{"general_wish": 35000, "text_message": 15000, "image_promotion": 150000, "video_promotion": 300000}'::jsonb,
 '24-48 hours', '1984-03-12', '2015-02-05', 70),

('Zakir Khan', 'Comedian', 'Stand-up comedian, writer, and poet. Known for Sakht Launda character and relatable comedy.',
 'Indore, Madhya Pradesh', '12M+', 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800&h=800&fit=crop&q=80',
 4.7, 543, true, true, 'approved',
 '{"general_wish": 18000, "text_message": 7000, "image_promotion": 75000, "video_promotion": 150000}'::jsonb,
 '12-24 hours', '1987-08-20', NULL, 65),

-- Sports
('Sania Mirza', 'Tennis Player', 'Former World No. 1 in doubles, 6-time Grand Slam champion. Padma Bhushan awardee and sports icon.',
 'Hyderabad, Telangana', '14M+', 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&h=800&fit=crop&q=80',
 4.8, 456, true, true, 'approved',
 '{"general_wish": 40000, "text_message": 16000, "image_promotion": 180000, "video_promotion": 360000}'::jsonb,
 '24-48 hours', '1986-11-15', '2010-04-12', 70);

-- Insert celebrity occasions (birthdays and anniversaries)
INSERT INTO celebrity_occasions (celebrity_id, occasion_name, occasion_type, occasion_date, auto_reply_enabled, auto_reply_template, is_public)
SELECT c.id, 'Birthday', 'birthday', c.date_of_birth, true, 
  'Thank you for your warm birthday wishes! Your love and support mean the world to me. - ' || c.name,
  true
FROM celebrities c WHERE c.date_of_birth IS NOT NULL;

INSERT INTO celebrity_occasions (celebrity_id, occasion_name, occasion_type, occasion_date, auto_reply_enabled, auto_reply_template, is_public)
SELECT c.id, 'Wedding Anniversary', 'anniversary', c.anniversary_date, true,
  'Thank you for celebrating this special day with us! - ' || c.name,
  true
FROM celebrities c WHERE c.anniversary_date IS NOT NULL;

-- Insert celebrity media (video samples for different types)
INSERT INTO celebrity_media (celebrity_id, media_type, file_url, thumbnail_url, title, description, is_public, is_promotional, consent_recorded)
VALUES
-- Birthday wishes
((SELECT id FROM celebrities WHERE name = 'Shah Rukh Khan'), 'video', 'https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=800&h=600', 'https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=400&h=300', 'Birthday Wish', 'Birthday wish video sample', true, false, true),
((SELECT id FROM celebrities WHERE name = 'Priyanka Chopra'), 'video', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&h=600', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300', 'Birthday Wish', 'Birthday wish video sample', true, false, true),
((SELECT id FROM celebrities WHERE name = 'Virat Kohli'), 'video', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&h=600', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300', 'Birthday Wish', 'Birthday wish video sample', true, false, true),
-- Anniversary wishes
((SELECT id FROM celebrities WHERE name = 'Deepika Padukone'), 'video', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300', 'Anniversary Wish', 'Anniversary wish video sample', true, false, true),
((SELECT id FROM celebrities WHERE name = 'Alia Bhatt'), 'video', 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&h=600', 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=300', 'Anniversary Wish', 'Anniversary wish video sample', true, false, true),
-- Promotional content
((SELECT id FROM celebrities WHERE name = 'Katrina Kaif'), 'video', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=600', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300', 'Brand Promotion', 'Beauty brand promotional video', true, true, true),
((SELECT id FROM celebrities WHERE name = 'Ranveer Singh'), 'video', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600', 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300', 'Fashion Ad', 'Fashion brand promotional video', true, true, true),
-- Event promotion
((SELECT id FROM celebrities WHERE name = 'A.R. Rahman'), 'video', 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=600', 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=300', 'Concert Promo', 'Music concert promotional video', true, true, true),
((SELECT id FROM celebrities WHERE name = 'Zakir Khan'), 'video', 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=800&h=600', 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=300', 'Comedy Show', 'Stand-up show promotional video', true, true, true),
-- Congratulations
((SELECT id FROM celebrities WHERE name = 'MS Dhoni'), 'video', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=600', 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=300', 'Congratulations', 'Congratulations video sample', true, false, true),
((SELECT id FROM celebrities WHERE name = 'Sania Mirza'), 'video', 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&h=600', 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&h=300', 'Sports Achievement', 'Achievement congratulations video', true, false, true);