-- Create celebrity categories table
CREATE TABLE public.celebrity_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.celebrity_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for category access
CREATE POLICY "Admin can manage categories" 
ON public.celebrity_categories 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles p 
  WHERE p.user_id = auth.uid() AND p.role = 'admin'
));

CREATE POLICY "Everyone can view active categories" 
ON public.celebrity_categories 
FOR SELECT 
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_celebrity_categories_updated_at
BEFORE UPDATE ON public.celebrity_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.celebrity_categories (name, description) VALUES
('Actor/Actress', 'Film and television actors'),
('Musician/Singer', 'Musicians, singers, and music artists'),
('Influencer', 'Social media influencers and content creators'),
('Athlete', 'Sports personalities and athletes'),
('Business Leader', 'Entrepreneurs and business executives'),
('Content Creator', 'YouTubers, streamers, and digital creators'),
('TV Personality', 'Television hosts and personalities'),
('Author', 'Writers, novelists, and published authors'),
('Politician', 'Political figures and public servants'),
('Comedian', 'Stand-up comedians and comedy artists'),
('Model', 'Fashion and commercial models'),
('Chef', 'Professional chefs and culinary experts'),
('Dancer', 'Professional dancers and choreographers'),
('Other', 'Other celebrity categories');

-- Add earnings columns to display in admin
-- These might already exist, so we'll use IF NOT EXISTS equivalent
DO $$
BEGIN
    -- Check if total_earnings column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'celebrities' AND column_name = 'total_earnings') THEN
        ALTER TABLE public.celebrities ADD COLUMN total_earnings INTEGER DEFAULT 0;
    END IF;
    
    -- Check if available_balance column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'celebrities' AND column_name = 'available_balance') THEN
        ALTER TABLE public.celebrities ADD COLUMN available_balance INTEGER DEFAULT 0;
    END IF;
END $$;