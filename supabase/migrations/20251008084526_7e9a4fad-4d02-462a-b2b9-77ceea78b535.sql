-- Create occasion_wishes table
CREATE TABLE IF NOT EXISTS public.occasion_wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  occasion_id UUID NOT NULL REFERENCES public.celebrity_occasions(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  reply_message TEXT,
  reply_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.occasion_wishes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create their own occasion wishes"
  ON public.occasion_wishes
  FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their own occasion wishes"
  ON public.occasion_wishes
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admin can manage all occasion wishes"
  ON public.occasion_wishes
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Add updated_at trigger
CREATE TRIGGER update_occasion_wishes_updated_at
  BEFORE UPDATE ON public.occasion_wishes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_occasion_wishes_user_id ON public.occasion_wishes(user_id);
CREATE INDEX idx_occasion_wishes_celebrity_id ON public.occasion_wishes(celebrity_id);
CREATE INDEX idx_occasion_wishes_occasion_id ON public.occasion_wishes(occasion_id);
CREATE INDEX idx_occasion_wishes_created_at ON public.occasion_wishes(created_at DESC);