-- Create table for Image + Music generations
CREATE TABLE public.image_music_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  audio_url TEXT,
  vocal_url TEXT,
  video_url TEXT,
  description TEXT,
  lyrics TEXT,
  genre TEXT,
  mood TEXT,
  duration_seconds INTEGER,
  has_vocals BOOLEAN DEFAULT false,
  amount_charged NUMERIC DEFAULT 120,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE public.image_music_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own image music generations" 
ON public.image_music_generations 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = image_music_generations.user_id));

CREATE POLICY "Users can create their own image music generations" 
ON public.image_music_generations 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = image_music_generations.user_id));

CREATE POLICY "Users can update their own image music generations" 
ON public.image_music_generations 
FOR UPDATE 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = image_music_generations.user_id));