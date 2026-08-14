-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('user', 'celebrity', 'admin');

-- Create user plans enum
CREATE TYPE public.user_plan AS ENUM ('basic', 'premium', 'elite');

-- Create booking service types enum
CREATE TYPE public.service_type AS ENUM ('video_wish', 'image_promotion', 'video_promotion');

-- Create booking status enum
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- Create users profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  role user_role DEFAULT 'user' NOT NULL,
  plan user_plan DEFAULT 'basic',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create celebrities table
CREATE TABLE public.celebrities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  bio TEXT,
  location TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  followers TEXT,
  image_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  delivery_time TEXT DEFAULT '24 hours',
  general_wish_price INTEGER DEFAULT 500,
  image_promotion_price INTEGER DEFAULT 10000,
  video_promotion_price INTEGER DEFAULT 50000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price INTEGER NOT NULL,
  original_price INTEGER,
  discount_percentage INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]',
  referral_commission_l1 INTEGER DEFAULT 0,
  referral_commission_l2 INTEGER DEFAULT 0,
  service_discount_percentage INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  celebrity_id UUID REFERENCES public.celebrities(id) NOT NULL,
  service_type service_type NOT NULL,
  original_price INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  final_price INTEGER NOT NULL,
  status booking_status DEFAULT 'pending',
  message TEXT,
  instructions TEXT,
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create referral transactions table
CREATE TABLE public.referral_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES public.profiles(id) NOT NULL,
  referred_id UUID REFERENCES public.profiles(id) NOT NULL,
  booking_id UUID REFERENCES public.bookings(id),
  commission_amount INTEGER NOT NULL,
  commission_level INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebrities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for celebrities
CREATE POLICY "Everyone can view active celebrities" ON public.celebrities
  FOR SELECT USING (is_active = true);

CREATE POLICY "Celebrity can update their own data" ON public.celebrities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = celebrities.profile_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all celebrities" ON public.celebrities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for plans
CREATE POLICY "Everyone can view active plans" ON public.plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage plans" ON public.plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Celebrity can view their bookings" ON public.bookings
  FOR SELECT USING (
    celebrity_id IN (
      SELECT id FROM public.celebrities c
      JOIN public.profiles p ON c.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for referral transactions
CREATE POLICY "Users can view their referral transactions" ON public.referral_transactions
  FOR SELECT USING (
    referrer_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    ) OR referred_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage referral transactions" ON public.referral_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to generate referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, referral_code, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    public.generate_referral_code(),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_celebrities_updated_at
  BEFORE UPDATE ON public.celebrities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.plans (name, price, original_price, discount_percentage, features, referral_commission_l1, referral_commission_l2, service_discount_percentage, is_popular) VALUES
('basic', 50, 50, 0, '["Access to Create Wish", "Business Promotions", "Create AI Music", "Basic customer support", "5% referral commission (Level 1 only)"]', 5, 0, 0, false),
('premium', 499, 555, 25, '["Everything in Basic", "25% discount on all services", "Priority customer support", "Advanced analytics", "10% referral commission (Level 1)", "5% referral commission (Level 2)", "Exclusive celebrity access"]', 10, 5, 25, true),
('elite', 999, 999, 40, '["Everything in Premium", "40% discount on all services", "Dedicated account manager", "Custom celebrity requests", "Advanced referral tracking", "Monthly strategy calls", "VIP celebrity events access"]', 15, 10, 40, false);

-- Insert sample admin user data (will be created after auth signup)
-- Insert sample celebrity data
INSERT INTO public.celebrities (name, category, bio, location, rating, review_count, followers, image_url, is_verified, general_wish_price, image_promotion_price, video_promotion_price) VALUES
('Priyanka Sharma', 'Actress & Model', 'National Award-winning actress known for powerful performances in both commercial and art films. Also a successful model and brand ambassador for leading fashion brands.', 'Mumbai, India', 4.8, 3247, '3.2M', 'https://images.unsplash.com/photo-1494790108755-2616b612b277?w=400&h=400&fit=crop&crop=face', true, 500, 10000, 50000),
('Rajesh Kumar', 'Actor & Singer', 'Versatile actor and playback singer with over 15 years in the industry. Known for his powerful voice and compelling screen presence.', 'Chennai, India', 4.6, 2891, '2.8M', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face', true, 750, 12000, 60000),
('Anita Singh', 'Singer & Composer', 'Classical music virtuoso and contemporary composer. Has won multiple Grammy nominations and National Film Awards for her musical compositions.', 'Delhi, India', 4.9, 4156, '4.1M', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face', true, 600, 11000, 55000);