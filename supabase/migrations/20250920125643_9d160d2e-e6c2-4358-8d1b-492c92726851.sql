-- Add file storage buckets for celebrity content
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('profile-photos', 'profile-photos', true),
  ('celebrity-avatars', 'celebrity-avatars', false),
  ('promotional-content', 'promotional-content', false),
  ('verification-docs', 'verification-docs', false);

-- Create storage policies for profile photos
CREATE POLICY "Profile photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Celebrity avatar storage policies
CREATE POLICY "Celebrities can manage their avatar content" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'celebrity-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Promotional content storage policies
CREATE POLICY "Celebrities can manage promotional content" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'promotional-content' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin can view all promotional content
CREATE POLICY "Admin can view promotional content" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'promotional-content' AND EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Verification documents storage policies
CREATE POLICY "Users can upload verification docs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin can view verification docs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'verification-docs' AND EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Enhanced celebrities table with additional fields
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS anniversary_date DATE;
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS other_occasions TEXT;
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}';
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS commission_percentage INTEGER DEFAULT 70;
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS avatar_trained BOOLEAN DEFAULT false;
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS total_earnings INTEGER DEFAULT 0;
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS available_balance INTEGER DEFAULT 0;

-- Create celebrity wallet transactions table
CREATE TABLE IF NOT EXISTS celebrity_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earning', 'withdrawal', 'bonus', 'penalty')),
  amount INTEGER NOT NULL,
  commission_percentage INTEGER,
  platform_fee INTEGER,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on wallet transactions
ALTER TABLE celebrity_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet transactions
CREATE POLICY "Celebrities can view their own transactions" 
ON celebrity_wallet_transactions 
FOR SELECT 
USING (celebrity_id IN (
  SELECT c.id FROM celebrities c 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Admin can manage all wallet transactions" 
ON celebrity_wallet_transactions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create celebrity events table
CREATE TABLE IF NOT EXISTS celebrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT CHECK (event_type IN ('movie_release', 'award_show', 'concert', 'premiere', 'anniversary', 'birthday', 'other')),
  location TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on celebrity events
ALTER TABLE celebrity_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for celebrity events
CREATE POLICY "Everyone can view public events" 
ON celebrity_events 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Celebrities can manage their events" 
ON celebrity_events 
FOR ALL 
USING (celebrity_id IN (
  SELECT c.id FROM celebrities c 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Admin can manage all events" 
ON celebrity_events 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create celebrity media table
CREATE TABLE IF NOT EXISTS celebrity_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'audio')),
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_avatar_content BOOLEAN DEFAULT false,
  is_promotional BOOLEAN DEFAULT false,
  consent_recorded BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMP WITH TIME ZONE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on celebrity media
ALTER TABLE celebrity_media ENABLE ROW LEVEL SECURITY;

-- RLS policies for celebrity media
CREATE POLICY "Everyone can view public media" 
ON celebrity_media 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Celebrities can manage their media" 
ON celebrity_media 
FOR ALL 
USING (celebrity_id IN (
  SELECT c.id FROM celebrities c 
  JOIN profiles p ON c.profile_id = p.id 
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Admin can view all media" 
ON celebrity_media 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Update bookings table with commission tracking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS celebrity_commission INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS platform_fee INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS commission_percentage INTEGER;

-- Function to calculate and distribute commission
CREATE OR REPLACE FUNCTION calculate_booking_commission()
RETURNS TRIGGER AS $$
DECLARE
  celebrity_commission_rate INTEGER;
BEGIN
  -- Get celebrity commission percentage
  SELECT commission_percentage INTO celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  -- Set default if not found
  IF celebrity_commission_rate IS NULL THEN
    celebrity_commission_rate := 70;
  END IF;
  
  -- Calculate commissions
  NEW.commission_percentage := celebrity_commission_rate;
  NEW.celebrity_commission := (NEW.final_price * celebrity_commission_rate / 100);
  NEW.platform_fee := NEW.final_price - NEW.celebrity_commission;
  
  -- Create wallet transaction when booking is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO celebrity_wallet_transactions (
      celebrity_id,
      booking_id,
      transaction_type,
      amount,
      commission_percentage,
      platform_fee,
      description,
      status
    ) VALUES (
      NEW.celebrity_id,
      NEW.id,
      'earning',
      NEW.celebrity_commission,
      celebrity_commission_rate,
      NEW.platform_fee,
      'Commission from booking #' || NEW.id,
      'completed'
    );
    
    -- Update celebrity earnings
    UPDATE celebrities 
    SET 
      total_earnings = total_earnings + NEW.celebrity_commission,
      available_balance = available_balance + NEW.celebrity_commission
    WHERE id = NEW.celebrity_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for commission calculation
DROP TRIGGER IF EXISTS booking_commission_trigger ON bookings;
CREATE TRIGGER booking_commission_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_commission();

-- Add updated_at trigger to celebrity_events
CREATE TRIGGER update_celebrity_events_updated_at
  BEFORE UPDATE ON celebrity_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample celebrity for testing
DO $$
DECLARE
  celebrity_profile_id UUID;
  celebrity_id UUID;
BEGIN
  -- Create a celebrity profile
  INSERT INTO profiles (
    user_id, 
    email, 
    first_name, 
    last_name, 
    role, 
    referral_code
  ) VALUES (
    gen_random_uuid(),
    'celebrity@example.com',
    'John',
    'Celebrity',
    'celebrity',
    'CEL' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
  ) RETURNING id INTO celebrity_profile_id;
  
  -- Create celebrity record
  INSERT INTO celebrities (
    profile_id,
    name,
    category,
    bio,
    general_wish_price,
    image_promotion_price,
    video_promotion_price,
    delivery_time,
    location,
    followers,
    rating,
    is_verified,
    is_active,
    commission_percentage,
    date_of_birth,
    social_media
  ) VALUES (
    celebrity_profile_id,
    'John Celebrity',
    'Actor/Actress',
    'Award-winning actor with over 15 years of experience in film and television. Known for versatile performances and strong fan engagement.',
    5000,
    25000,
    50000,
    '24 hours',
    'Mumbai, India',
    '2.5M',
    4.8,
    true,
    true,
    70,
    '1985-06-15',
    '{"instagram": "@johncelebrity", "twitter": "@johncelebrity", "youtube": "JohnCelebrityOfficial"}'
  ) RETURNING id INTO celebrity_id;
  
  -- Add some sample events
  INSERT INTO celebrity_events (celebrity_id, title, description, event_date, event_type, location) VALUES
    (celebrity_id, 'Movie Premiere - "The New Beginning"', 'Red carpet premiere of upcoming blockbuster', '2024-04-15', 'premiere', 'Mumbai'),
    (celebrity_id, 'Award Show Performance', 'Special performance at the Annual Film Awards', '2024-05-20', 'award_show', 'Delhi'),
    (celebrity_id, 'Birthday Celebration', 'Annual birthday celebration with fans', '2024-06-15', 'birthday', 'Mumbai');
    
END $$;