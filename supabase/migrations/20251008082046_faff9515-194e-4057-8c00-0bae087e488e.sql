-- Create celebrity_favorites table (tracks user subscriptions to celebrities)
CREATE TABLE IF NOT EXISTS public.celebrity_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  price_paid INTEGER NOT NULL,
  referrer_commission INTEGER DEFAULT 0,
  celebrity_commission INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(user_id, celebrity_id)
);

-- Create celebrity_favorite_pricing table (admin-configured pricing)
CREATE TABLE IF NOT EXISTS public.celebrity_favorite_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL UNIQUE REFERENCES public.celebrities(id) ON DELETE CASCADE,
  price INTEGER NOT NULL DEFAULT 999,
  referrer_commission_percentage INTEGER NOT NULL DEFAULT 10,
  celebrity_commission_percentage INTEGER NOT NULL DEFAULT 5,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ugc_video_generations table (tracks UGC video requests)
CREATE TABLE IF NOT EXISTS public.ugc_video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  script TEXT NOT NULL,
  concept TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  price_paid INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create image_promotions table (tracks commercial image generations)
CREATE TABLE IF NOT EXISTS public.image_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  branding_details TEXT,
  generated_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  price_paid INTEGER NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create conversations table (DM system)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count_user INTEGER NOT NULL DEFAULT 0,
  unread_count_celebrity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, celebrity_id)
);

-- Create messages table (stores all messages)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'celebrity', 'system')),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create celebrity_occasions table (birthdays, anniversaries, etc.)
CREATE TABLE IF NOT EXISTS public.celebrity_occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  occasion_type TEXT NOT NULL CHECK (occasion_type IN ('birthday', 'anniversary', 'custom')),
  occasion_name TEXT NOT NULL,
  occasion_date DATE NOT NULL,
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_reply_template TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tds_reports table (tax deduction reports)
CREATE TABLE IF NOT EXISTS public.tds_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('celebrity_earnings', 'referral_commissions')),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  total_gross_amount INTEGER NOT NULL DEFAULT 0,
  total_tds_amount INTEGER NOT NULL DEFAULT 0,
  total_net_amount INTEGER NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  report_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, report_type, month, year)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_celebrity_favorites_user ON public.celebrity_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_celebrity_favorites_celebrity ON public.celebrity_favorites(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_ugc_video_user ON public.ugc_video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ugc_video_celebrity ON public.ugc_video_generations(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_image_promotions_user ON public.image_promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_image_promotions_celebrity ON public.image_promotions(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_celebrity ON public.conversations(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_celebrity_occasions_celebrity ON public.celebrity_occasions(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_celebrity_occasions_date ON public.celebrity_occasions(occasion_date);
CREATE INDEX IF NOT EXISTS idx_tds_reports_profile ON public.tds_reports(profile_id);
CREATE INDEX IF NOT EXISTS idx_tds_reports_period ON public.tds_reports(year, month);

-- Enable Row Level Security
ALTER TABLE public.celebrity_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebrity_favorite_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_video_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebrity_occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tds_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for celebrity_favorites
CREATE POLICY "Users can view their own favorites"
  ON public.celebrity_favorites FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own favorites"
  ON public.celebrity_favorites FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all favorites"
  ON public.celebrity_favorites FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for celebrity_favorite_pricing
CREATE POLICY "Everyone can view enabled pricing"
  ON public.celebrity_favorite_pricing FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Admin can manage pricing"
  ON public.celebrity_favorite_pricing FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for ugc_video_generations
CREATE POLICY "Users can view their own UGC videos"
  ON public.ugc_video_generations FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create UGC videos"
  ON public.ugc_video_generations FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own UGC videos"
  ON public.ugc_video_generations FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all UGC videos"
  ON public.ugc_video_generations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for image_promotions
CREATE POLICY "Users can view their own image promotions"
  ON public.image_promotions FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create image promotions"
  ON public.image_promotions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own image promotions"
  ON public.image_promotions FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all image promotions"
  ON public.image_promotions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Celebrities can view their conversations"
  ON public.conversations FOR SELECT
  USING (celebrity_id IN (SELECT c.id FROM celebrities c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users and celebrities can update their conversations"
  ON public.conversations FOR UPDATE
  USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    celebrity_id IN (SELECT c.id FROM celebrities c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid())
  );

CREATE POLICY "Admin can manage all conversations"
  ON public.conversations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE 
        user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        celebrity_id IN (SELECT c.id FROM celebrities c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid())
    )
  );

CREATE POLICY "Users and celebrities can create messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) AND
    conversation_id IN (
      SELECT id FROM conversations WHERE 
        user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        celebrity_id IN (SELECT c.id FROM celebrities c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE 
        user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
        celebrity_id IN (SELECT c.id FROM celebrities c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid())
    )
  );

CREATE POLICY "Admin can manage all messages"
  ON public.messages FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for celebrity_occasions
CREATE POLICY "Everyone can view public celebrity occasions"
  ON public.celebrity_occasions FOR SELECT
  USING (is_public = true);

CREATE POLICY "Celebrities can manage their own occasions"
  ON public.celebrity_occasions FOR ALL
  USING (celebrity_id IN (SELECT c.id FROM celebrities c JOIN profiles p ON c.profile_id = p.id WHERE p.user_id = auth.uid()));

CREATE POLICY "Admin can manage all celebrity occasions"
  ON public.celebrity_occasions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for tds_reports
CREATE POLICY "Users can view their own TDS reports"
  ON public.tds_reports FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage all TDS reports"
  ON public.tds_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create trigger for updated_at on celebrity_favorite_pricing
CREATE OR REPLACE FUNCTION update_celebrity_favorite_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER celebrity_favorite_pricing_updated_at
  BEFORE UPDATE ON public.celebrity_favorite_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_celebrity_favorite_pricing_updated_at();

-- Create trigger for updated_at on celebrity_occasions
CREATE TRIGGER celebrity_occasions_updated_at
  BEFORE UPDATE ON public.celebrity_occasions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add platform settings for default pricing
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('default_favorite_price', '999', 'Default price for celebrity favorites subscription')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('ugc_video_price', '500', 'Price per UGC video generation')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('image_promotion_price', '300', 'Price per image promotion generation')
ON CONFLICT (setting_key) DO NOTHING;