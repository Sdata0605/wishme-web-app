-- Create voice_call_wishes table to track AI voice call wishes
CREATE TABLE public.voice_call_wishes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  occasion TEXT NOT NULL,
  vapi_voice_id TEXT NOT NULL,
  vapi_voice_name TEXT,
  vapi_call_id TEXT,
  call_status TEXT DEFAULT 'pending',
  call_duration_seconds INTEGER,
  price_paid INTEGER NOT NULL DEFAULT 100,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.voice_call_wishes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own voice calls"
  ON public.voice_call_wishes
  FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create voice calls"
  ON public.voice_call_wishes
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all voice calls"
  ON public.voice_call_wishes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create user_vapi_voices table for custom uploaded voices
CREATE TABLE public.user_vapi_voices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vapi_voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_vapi_voices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user voices
CREATE POLICY "Users can view their own vapi voices"
  ON public.user_vapi_voices
  FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create vapi voices"
  ON public.user_vapi_voices
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own vapi voices"
  ON public.user_vapi_voices
  FOR DELETE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all vapi voices"
  ON public.user_vapi_voices
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));