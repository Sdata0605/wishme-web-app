-- Add service pricing fields to celebrities table and make them admin-controllable
-- Remove hardcoded prices, add admin-managed pricing

ALTER TABLE celebrities
DROP COLUMN IF EXISTS general_wish_price,
DROP COLUMN IF EXISTS image_promotion_price,
DROP COLUMN IF EXISTS video_promotion_price;

-- Add new admin-managed service pricing columns
ALTER TABLE celebrities
ADD COLUMN service_prices jsonb DEFAULT '{
  "general_wish": 5000,
  "image_promotion": 25000,
  "video_promotion": 50000,
  "text_message": 2000
}'::jsonb,
ADD COLUMN consent_photo_url text,
ADD COLUMN consent_video_url text,
ADD COLUMN consent_status text DEFAULT 'pending',
ADD COLUMN consent_given_at timestamp with time zone;

-- Create notifications table for celebrities
CREATE TABLE IF NOT EXISTS celebrity_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  celebrity_id uuid NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

-- Enable RLS on notifications
ALTER TABLE celebrity_notifications ENABLE ROW LEVEL SECURITY;

-- Celebrities can view their own notifications
CREATE POLICY "Celebrities can view their own notifications"
ON celebrity_notifications FOR SELECT
USING (
  celebrity_id IN (
    SELECT c.id FROM celebrities c
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Admin can manage all notifications
CREATE POLICY "Admin can manage all notifications"
ON celebrity_notifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Celebrities can update their own notifications (mark as read)
CREATE POLICY "Celebrities can update their own notifications"
ON celebrity_notifications FOR UPDATE
USING (
  celebrity_id IN (
    SELECT c.id FROM celebrities c
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Create celebrity settings table
CREATE TABLE IF NOT EXISTS celebrity_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  celebrity_id uuid NOT NULL UNIQUE REFERENCES celebrities(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  booking_alerts boolean DEFAULT true,
  commission_alerts boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  auto_accept_bookings boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE celebrity_settings ENABLE ROW LEVEL SECURITY;

-- Celebrities can manage their own settings
CREATE POLICY "Celebrities can manage their own settings"
ON celebrity_settings FOR ALL
USING (
  celebrity_id IN (
    SELECT c.id FROM celebrities c
    JOIN profiles p ON c.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Admin can manage all settings
CREATE POLICY "Admin can manage all settings"
ON celebrity_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger for celebrity settings updated_at
CREATE TRIGGER update_celebrity_settings_updated_at
BEFORE UPDATE ON celebrity_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();