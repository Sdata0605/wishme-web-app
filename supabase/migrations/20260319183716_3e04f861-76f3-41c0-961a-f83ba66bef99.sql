-- Add AI auto-reply setting to celebrity_settings
ALTER TABLE public.celebrity_settings
  ADD COLUMN IF NOT EXISTS ai_auto_reply_enabled boolean DEFAULT false;