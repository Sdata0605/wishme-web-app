-- Create occasions table
CREATE TABLE public.occasions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create occasion_bookings table
CREATE TABLE public.occasion_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  occasion_id UUID NOT NULL REFERENCES public.occasions(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('video', 'greeting_card')),
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  message TEXT NOT NULL,
  ai_generated_content TEXT,
  ai_video_url TEXT,
  greeting_card_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  price INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occasion_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for occasions
CREATE POLICY "Everyone can view active occasions"
ON public.occasions FOR SELECT
USING (is_active = true);

CREATE POLICY "Admin can manage occasions"
ON public.occasions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- RLS Policies for occasion_bookings
CREATE POLICY "Users can view their own occasion bookings"
ON public.occasion_bookings FOR SELECT
USING (
  user_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create occasion bookings"
ON public.occasion_bookings FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Admin can manage all occasion bookings"
ON public.occasion_bookings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_occasions_updated_at
BEFORE UPDATE ON public.occasions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_occasion_bookings_updated_at
BEFORE UPDATE ON public.occasion_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();