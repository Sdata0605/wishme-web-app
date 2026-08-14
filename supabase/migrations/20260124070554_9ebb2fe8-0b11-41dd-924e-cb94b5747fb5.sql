-- Create table for TTS (Text-to-Speech) generations
CREATE TABLE public.tts_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  voice_name TEXT,
  audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  credits_used INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Sound Effects generations
CREATE TABLE public.sound_effect_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 5,
  audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  credits_used INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Voice Conversions
CREATE TABLE public.voice_conversion_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_file_name TEXT,
  target_voice_id TEXT NOT NULL,
  target_voice_name TEXT,
  audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  credits_used INTEGER DEFAULT 25,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Audio Isolation
CREATE TABLE public.audio_isolation_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  original_file_name TEXT,
  audio_url TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  credits_used INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tts_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sound_effect_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_conversion_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_isolation_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for TTS generations
CREATE POLICY "Users can view their own TTS generations" 
ON public.tts_generations FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = tts_generations.user_id));

CREATE POLICY "Users can create their own TTS generations" 
ON public.tts_generations FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = tts_generations.user_id));

CREATE POLICY "Users can delete their own TTS generations" 
ON public.tts_generations FOR DELETE 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = tts_generations.user_id));

-- Create policies for Sound Effect generations
CREATE POLICY "Users can view their own SFX generations" 
ON public.sound_effect_generations FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = sound_effect_generations.user_id));

CREATE POLICY "Users can create their own SFX generations" 
ON public.sound_effect_generations FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = sound_effect_generations.user_id));

CREATE POLICY "Users can delete their own SFX generations" 
ON public.sound_effect_generations FOR DELETE 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = sound_effect_generations.user_id));

-- Create policies for Voice Conversion generations
CREATE POLICY "Users can view their own voice conversions" 
ON public.voice_conversion_generations FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = voice_conversion_generations.user_id));

CREATE POLICY "Users can create their own voice conversions" 
ON public.voice_conversion_generations FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = voice_conversion_generations.user_id));

CREATE POLICY "Users can delete their own voice conversions" 
ON public.voice_conversion_generations FOR DELETE 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = voice_conversion_generations.user_id));

-- Create policies for Audio Isolation generations
CREATE POLICY "Users can view their own audio isolations" 
ON public.audio_isolation_generations FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = audio_isolation_generations.user_id));

CREATE POLICY "Users can create their own audio isolations" 
ON public.audio_isolation_generations FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = audio_isolation_generations.user_id));

CREATE POLICY "Users can delete their own audio isolations" 
ON public.audio_isolation_generations FOR DELETE 
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = audio_isolation_generations.user_id));