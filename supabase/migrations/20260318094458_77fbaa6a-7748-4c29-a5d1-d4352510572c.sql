
-- Add new columns to message_events for per-channel control
ALTER TABLE public.message_events 
  ADD COLUMN IF NOT EXISTS email_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_template_id uuid REFERENCES public.message_templates(id),
  ADD COLUMN IF NOT EXISTS recipient_type text DEFAULT 'user';

-- Insert global channel settings into platform_settings if not exists
INSERT INTO public.platform_settings (setting_key, setting_value, updated_at)
VALUES 
  ('email_global_enabled', 'true', now()),
  ('sms_global_enabled', 'false', now()),
  ('whatsapp_global_enabled', 'true', now())
ON CONFLICT (setting_key) DO NOTHING;
