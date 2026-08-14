-- Create enums for music generation
CREATE TYPE public.music_generation_type AS ENUM ('with_lyrics', 'instrumental', 'custom');
CREATE TYPE public.music_generation_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create music_generations table
CREATE TABLE public.music_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  song_title TEXT NOT NULL,
  genre TEXT,
  mood TEXT,
  prompt TEXT,
  lyrics TEXT,
  song_url TEXT,
  download_url TEXT,
  generation_type music_generation_type NOT NULL DEFAULT 'with_lyrics',
  status music_generation_status NOT NULL DEFAULT 'pending',
  credits_used INTEGER NOT NULL DEFAULT 1,
  api_task_id TEXT,
  error_message TEXT,
  duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create user_music_credits table
CREATE TABLE public.user_music_credits (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  free_generations_used INTEGER NOT NULL DEFAULT 0,
  free_generations_limit INTEGER NOT NULL DEFAULT 3,
  paid_credits INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_music_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for music_generations
CREATE POLICY "Users can view their own generations"
  ON public.music_generations FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own generations"
  ON public.music_generations FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own generations"
  ON public.music_generations FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all generations"
  ON public.music_generations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- RLS Policies for user_music_credits
CREATE POLICY "Users can view their own credits"
  ON public.user_music_credits FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own credits"
  ON public.user_music_credits FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all credits"
  ON public.user_music_credits FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- Insert platform settings for Music API
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
  ('music_api_enabled', 'false', 'Enable/disable MusicAPI.ai integration'),
  ('music_api_free_limit', '3', 'Free music generations per user per month'),
  ('music_api_credits_per_generation', '1', 'Credits consumed per music generation');

-- Function to auto-create user_music_credits on profile creation
CREATE OR REPLACE FUNCTION public.create_user_music_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_music_credits (user_id, free_generations_limit)
  VALUES (NEW.id, 3)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create credits on new profile
CREATE TRIGGER create_music_credits_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_music_credits();

-- Function to reset monthly free credits
CREATE OR REPLACE FUNCTION public.reset_monthly_music_credits()
RETURNS void AS $$
BEGIN
  UPDATE public.user_music_credits
  SET 
    free_generations_used = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < date_trunc('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create indexes for performance
CREATE INDEX idx_music_generations_user_id ON public.music_generations(user_id);
CREATE INDEX idx_music_generations_status ON public.music_generations(status);
CREATE INDEX idx_music_generations_created_at ON public.music_generations(created_at DESC);