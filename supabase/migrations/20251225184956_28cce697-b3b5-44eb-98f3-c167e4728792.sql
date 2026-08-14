-- Create photo_wishes table for storing photo wish generations
CREATE TABLE public.photo_wishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_image_url TEXT NOT NULL,
  edited_image_url TEXT,
  occasion TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  wish_message TEXT NOT NULL,
  sender_name TEXT,
  text_style TEXT DEFAULT 'elegant',
  amount_charged NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.photo_wishes ENABLE ROW LEVEL SECURITY;

-- Users can view their own photo wishes
CREATE POLICY "Users can view their own photo wishes"
ON public.photo_wishes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own photo wishes
CREATE POLICY "Users can insert their own photo wishes"
ON public.photo_wishes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own photo wishes
CREATE POLICY "Users can update their own photo wishes"
ON public.photo_wishes
FOR UPDATE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_photo_wishes_user_id ON public.photo_wishes(user_id);
CREATE INDEX idx_photo_wishes_status ON public.photo_wishes(status);

-- Add photo wish price to platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES ('photo_wish_price', '99', 'Price for generating a photo wish with text overlay')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE public.photo_wishes IS 'Stores photo wishes where users upload images and AI adds stylized text overlays';