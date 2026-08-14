-- Phase 1: Create admin_media_assets table for centralized image management
CREATE TABLE admin_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('hero_background', 'featured_section_bg', 'celebrity_promotional')),
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  title TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_media_assets_type ON admin_media_assets(asset_type);
CREATE INDEX idx_admin_media_assets_celebrity ON admin_media_assets(celebrity_id);
CREATE INDEX idx_admin_media_assets_active ON admin_media_assets(is_active);

ALTER TABLE admin_media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active media assets"
ON admin_media_assets FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage media assets"
ON admin_media_assets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Phase 2: Create loved_ones table
CREATE TABLE loved_ones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  relationship TEXT,
  notes TEXT,
  import_source TEXT CHECK (import_source IN ('manual', 'gmail', 'facebook', 'phonebook')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loved_ones_user ON loved_ones(user_id);
CREATE INDEX idx_loved_ones_dob ON loved_ones(date_of_birth);

ALTER TABLE loved_ones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own loved ones"
ON loved_ones FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users manage own loved ones"
ON loved_ones FOR ALL
USING (user_id = auth.uid());

-- Phase 3: Create occasion_alerts table
CREATE TABLE occasion_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loved_one_id UUID REFERENCES loved_ones(id) ON DELETE CASCADE,
  celebrity_id UUID REFERENCES celebrities(id) ON DELETE CASCADE,
  occasion_type TEXT NOT NULL CHECK (occasion_type IN ('birthday', 'anniversary', 'custom', 'celebrity_event')),
  occasion_name TEXT,
  occasion_date DATE NOT NULL,
  alert_enabled BOOLEAN DEFAULT true,
  auto_send_enabled BOOLEAN DEFAULT false,
  alert_days_before INTEGER DEFAULT 3,
  reminder_time TIME DEFAULT '09:00:00',
  preferred_celebrity_id UUID REFERENCES celebrities(id),
  max_budget NUMERIC(10,2),
  message_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_occasion_alerts_user ON occasion_alerts(user_id);
CREATE INDEX idx_occasion_alerts_date ON occasion_alerts(occasion_date);
CREATE INDEX idx_occasion_alerts_loved_one ON occasion_alerts(loved_one_id);
CREATE INDEX idx_occasion_alerts_enabled ON occasion_alerts(alert_enabled);

ALTER TABLE occasion_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own alerts"
ON occasion_alerts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users manage own alerts"
ON occasion_alerts FOR ALL
USING (user_id = auth.uid());

-- Phase 4: Enhance celebrity_favorites table
ALTER TABLE celebrity_favorites
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('wallet', 'razorpay'));

-- Phase 5: Create subscription_usage tracking
CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  favorite_id UUID NOT NULL REFERENCES celebrity_favorites(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('ugc_video', 'wish', 'image_promotion', 'video_promotion', 'text_message')),
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'razorpay')),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_usage_favorite ON subscription_usage(favorite_id);
CREATE INDEX idx_subscription_usage_service ON subscription_usage(service_type);

ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription usage"
ON subscription_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM celebrity_favorites
    WHERE celebrity_favorites.id = subscription_usage.favorite_id
    AND celebrity_favorites.user_id = auth.uid()
  )
);

-- Phase 6: Update celebrities table for promotional images
ALTER TABLE celebrities
ADD COLUMN IF NOT EXISTS promotional_image_url TEXT,
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- Phase 7: Create timestamp update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_media_assets_updated_at
BEFORE UPDATE ON admin_media_assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loved_ones_updated_at
BEFORE UPDATE ON loved_ones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occasion_alerts_updated_at
BEFORE UPDATE ON occasion_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();