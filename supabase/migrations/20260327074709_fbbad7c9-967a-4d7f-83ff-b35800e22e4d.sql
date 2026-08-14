
-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wishme_payment_id TEXT UNIQUE NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  booking_id UUID,
  music_generation_id UUID,
  voice_call_id UUID,
  greeting_card_id UUID,
  photo_wish_id UUID,
  image_promotion_id UUID,
  wish_order_id UUID,
  user_id UUID REFERENCES public.profiles(id),
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  service_type TEXT,
  description TEXT,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_wishme_id ON public.payment_transactions(wishme_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking ON public.payment_transactions(booking_id);

-- RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = public.get_my_profile_id());

CREATE POLICY "Service role full access"
  ON public.payment_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add wishme_payment_id to existing tables
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS wishme_payment_id TEXT;
ALTER TABLE public.wish_celebrity_orders ADD COLUMN IF NOT EXISTS wishme_payment_id TEXT;
ALTER TABLE public.music_generations ADD COLUMN IF NOT EXISTS wishme_payment_id TEXT;
ALTER TABLE public.greeting_card_generations ADD COLUMN IF NOT EXISTS wishme_payment_id TEXT;
