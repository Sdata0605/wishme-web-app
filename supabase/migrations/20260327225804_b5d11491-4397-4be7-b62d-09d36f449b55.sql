
-- Add missing columns to message_events table for per-channel control
ALTER TABLE public.message_events 
  ADD COLUMN IF NOT EXISTS email_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_template_id uuid REFERENCES public.message_templates(id),
  ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS sms_flow_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add platform_settings entries for global channel toggles
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
  ('email_global_enabled', 'true', 'Master toggle for email notifications'),
  ('sms_global_enabled', 'false', 'Master toggle for SMS notifications'),
  ('whatsapp_global_enabled', 'true', 'Master toggle for WhatsApp notifications')
ON CONFLICT (setting_key) DO NOTHING;
