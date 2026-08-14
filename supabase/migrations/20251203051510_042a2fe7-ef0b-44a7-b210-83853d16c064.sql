-- Create table for tracking user's cloned voices (security fix)
CREATE TABLE public.user_cloned_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  elevenlabs_voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  voice_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, elevenlabs_voice_id)
);

-- Enable RLS
ALTER TABLE public.user_cloned_voices ENABLE ROW LEVEL SECURITY;

-- Users can ONLY see their own voices
CREATE POLICY "Users view own voices" ON public.user_cloned_voices
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users create own voices" ON public.user_cloned_voices
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users delete own voices" ON public.user_cloned_voices
  FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create table for Suno singing personas
CREATE TABLE public.user_singing_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  clip_id TEXT NOT NULL,
  audio_file_key TEXT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, persona_id)
);

-- Enable RLS
ALTER TABLE public.user_singing_personas ENABLE ROW LEVEL SECURITY;

-- Users can ONLY see their own personas
CREATE POLICY "Users view own personas" ON public.user_singing_personas
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users create personas" ON public.user_singing_personas
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users update own personas" ON public.user_singing_personas
  FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users delete personas" ON public.user_singing_personas
  FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));