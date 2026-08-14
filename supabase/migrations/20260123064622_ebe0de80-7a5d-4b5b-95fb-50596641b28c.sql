-- Create UGC Ads table for product promotion videos
CREATE TABLE IF NOT EXISTS public.ugc_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  product_image_url TEXT NOT NULL,
  script TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'script_generating', 'video_generating', 'completed', 'failed')),
  avatar_id TEXT,
  avatar_name TEXT,
  voice_id TEXT,
  heygen_video_id TEXT,
  generation_error TEXT,
  price_paid NUMERIC(10,2) DEFAULT 0,
  aspect_ratio TEXT DEFAULT '9:16',
  video_style TEXT DEFAULT 'ugc',
  prompt TEXT,
  hook_style TEXT,
  call_to_action TEXT,
  background_type TEXT DEFAULT 'product',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ugc_ads ENABLE ROW LEVEL SECURITY;

-- Users can view their own ads
CREATE POLICY "Users can view their own UGC ads"
  ON public.ugc_ads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own ads
CREATE POLICY "Users can create their own UGC ads"
  ON public.ugc_ads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ads
CREATE POLICY "Users can update their own UGC ads"
  ON public.ugc_ads
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all ads
CREATE POLICY "Admins can view all UGC ads"
  ON public.ugc_ads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_ugc_ads_updated_at
  BEFORE UPDATE ON public.ugc_ads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ugc_ads_user_id ON public.ugc_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_ads_status ON public.ugc_ads(status);

-- Add platform setting for UGC ads price
INSERT INTO public.platform_settings (setting_key, setting_value)
VALUES ('ugc_ads_price', '999')
ON CONFLICT (setting_key) DO NOTHING;