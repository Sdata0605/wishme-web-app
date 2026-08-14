-- Create api_key_audit_log table for tracking API key changes
CREATE TABLE IF NOT EXISTS public.api_key_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  key_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'tested')),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.api_key_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view api key audit logs"
ON public.api_key_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin_by_auth_uid());

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert api key audit logs"
ON public.api_key_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_by_auth_uid());

-- Seed missing platform_settings records with UPSERT
INSERT INTO public.platform_settings (setting_key, setting_value, description) VALUES
  ('site_name', 'Wish Me', 'Platform display name'),
  ('support_email', 'support@wishme.com', 'Support contact email'),
  ('platform_description', 'Connect with your favorite celebrities and create unforgettable moments.', 'Platform description'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('require_email_verification', 'true', 'Require email verification for new users'),
  ('enable_two_factor', 'false', 'Enable 2FA for users'),
  ('session_timeout', '60', 'Session timeout in minutes'),
  ('max_login_attempts', '5', 'Max login attempts before lockout'),
  ('new_user_notifications', 'true', 'Notify admin on new registrations'),
  ('new_booking_notifications', 'true', 'Notify admin on new bookings'),
  ('celebrity_applications_notifications', 'true', 'Notify on celebrity applications'),
  ('system_alerts', 'true', 'Enable system alerts'),
  ('auto_backup', 'true', 'Enable automatic daily backups'),
  ('smtp_host', 'smtp.gmail.com', 'SMTP server host'),
  ('smtp_port', '587', 'SMTP server port'),
  ('email_from', 'noreply@wishme.com', 'Default from email address'),
  ('email_from_name', 'Wish Me Team', 'Default from name for emails'),
  ('greeting_card_price', '2', 'Price per greeting card in INR')
ON CONFLICT (setting_key) DO NOTHING;