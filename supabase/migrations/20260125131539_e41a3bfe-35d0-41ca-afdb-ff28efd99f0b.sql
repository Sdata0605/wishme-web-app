-- =============================================
-- COMPLETE EMAIL & WHATSAPP MESSAGING SYSTEM
-- =============================================

-- 1. Message Templates Table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'both')),
  subject TEXT, -- Email only
  content TEXT NOT NULL, -- HTML for email, plain text for WhatsApp
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Message Events Table (automation triggers)
CREATE TABLE public.message_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,
  description TEXT,
  email_template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  whatsapp_template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  delay_minutes INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scheduled Messages Table
CREATE TABLE public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_whatsapp TEXT,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'both')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  payload JSONB,
  order_id UUID,
  order_type TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Message Logs Table
CREATE TABLE public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  recipient TEXT NOT NULL,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  template_name TEXT,
  event_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  message_id TEXT,
  metadata JSONB,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Messaging Settings Table
CREATE TABLE public.messaging_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL DEFAULT '',
  is_encrypted BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 6. Abandoned Cart Tracking Table
CREATE TABLE public.abandoned_cart_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  celebrity_id UUID REFERENCES public.celebrities(id) ON DELETE SET NULL,
  service_type TEXT,
  cart_data JSONB,
  checkout_started_at TIMESTAMPTZ DEFAULT NOW(),
  checkout_completed BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Bulk Campaigns Table
CREATE TABLE public.message_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp', 'both')),
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  recipient_filter JSONB, -- {"type": "all_users"} or {"type": "celebrities"} etc.
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_cart_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_campaigns ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES (Admin-only for most tables)
-- =============================================

-- Message Templates: Admin full access, public read for active templates
CREATE POLICY "Admins can manage message templates"
ON public.message_templates FOR ALL
TO authenticated
USING (public.is_admin_by_auth_uid())
WITH CHECK (public.is_admin_by_auth_uid());

CREATE POLICY "Active templates readable by authenticated users"
ON public.message_templates FOR SELECT
TO authenticated
USING (is_active = true);

-- Message Events: Admin only
CREATE POLICY "Admins can manage message events"
ON public.message_events FOR ALL
TO authenticated
USING (public.is_admin_by_auth_uid())
WITH CHECK (public.is_admin_by_auth_uid());

-- Scheduled Messages: Users can manage their own, admins can see all
CREATE POLICY "Users can manage own scheduled messages"
ON public.scheduled_messages FOR ALL
TO authenticated
USING (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid())
WITH CHECK (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

-- Message Logs: Admin only
CREATE POLICY "Admins can view message logs"
ON public.message_logs FOR SELECT
TO authenticated
USING (public.is_admin_by_auth_uid());

CREATE POLICY "System can insert message logs"
ON public.message_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Messaging Settings: Admin only
CREATE POLICY "Admins can manage messaging settings"
ON public.messaging_settings FOR ALL
TO authenticated
USING (public.is_admin_by_auth_uid())
WITH CHECK (public.is_admin_by_auth_uid());

-- Abandoned Cart: Users see own, admins see all
CREATE POLICY "Users can view own abandoned carts"
ON public.abandoned_cart_tracking FOR SELECT
TO authenticated
USING (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

CREATE POLICY "System can manage abandoned carts"
ON public.abandoned_cart_tracking FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Message Campaigns: Admin only
CREATE POLICY "Admins can manage campaigns"
ON public.message_campaigns FOR ALL
TO authenticated
USING (public.is_admin_by_auth_uid())
WITH CHECK (public.is_admin_by_auth_uid());

-- =============================================
-- INSERT DEFAULT SETTINGS
-- =============================================
INSERT INTO public.messaging_settings (setting_key, setting_value, is_encrypted, description) VALUES
  ('resend_api_key', '', true, 'Resend API key for sending emails'),
  ('email_from_address', 'noreply@wishme.com', false, 'Default email sender address'),
  ('email_from_name', 'Wish Me', false, 'Default email sender display name'),
  ('whatsapp_access_token', '', true, 'Meta WhatsApp API access token'),
  ('whatsapp_phone_number_id', '', false, 'WhatsApp Business phone number ID'),
  ('abandoned_cart_delay_minutes', '60', false, 'Minutes to wait before sending abandoned cart reminder'),
  ('enable_welcome_email', 'true', false, 'Send welcome email on user registration'),
  ('enable_welcome_whatsapp', 'true', false, 'Send welcome WhatsApp on user registration');

-- =============================================
-- INSERT DEFAULT MESSAGE EVENTS
-- =============================================
INSERT INTO public.message_events (event_key, description, delay_minutes, is_enabled) VALUES
  ('USER_REGISTERED', 'Triggered when a new user registers', 0, true),
  ('USER_SUBSCRIBED_CELEBRITY', 'Triggered when a user subscribes to a celebrity', 0, true),
  ('PAYMENT_ABANDONED', 'Triggered when user abandons checkout', 60, true),
  ('ORDER_COMPLETED', 'Triggered when an order is completed', 0, true),
  ('SCHEDULED_GIFT', 'User-scheduled gift/wish delivery', 0, true);

-- =============================================
-- INSERT DEFAULT TEMPLATES
-- =============================================
INSERT INTO public.message_templates (name, channel, subject, content, variables, is_active) VALUES
  (
    'Welcome Email',
    'email',
    'Welcome to Wish Me! 🎉',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #7c3aed;">Welcome to Wish Me, {{first_name}}! 🎉</h1>
      <p>Thank you for joining our platform.</p>
      <p>Subscribe to your favorite celebrities to start creating personalized video wishes!</p>
      <a href="https://wishmefinal.lovable.app/celebrities" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Explore Celebrities</a>
    </div>',
    '["{{first_name}}", "{{email}}"]'::jsonb,
    true
  ),
  (
    'Welcome WhatsApp',
    'whatsapp',
    NULL,
    '🎉 Welcome to Wish Me, {{first_name}}!

Thank you for joining us. Subscribe to your favorite celebrities to start creating personalized video wishes!

Explore now: https://wishmefinal.lovable.app/celebrities',
    '["{{first_name}}"]'::jsonb,
    true
  ),
  (
    'Order Completed Email',
    'email',
    'Your Order is Ready! 🎬',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #7c3aed;">Your Order is Ready! 🎬</h1>
      <p>Hi {{first_name}},</p>
      <p>Your {{service_type}} from <strong>{{celebrity_name}}</strong> is complete!</p>
      <a href="{{order_url}}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Your Order</a>
    </div>',
    '["{{first_name}}", "{{service_type}}", "{{celebrity_name}}", "{{order_url}}"]'::jsonb,
    true
  ),
  (
    'Order Completed WhatsApp',
    'whatsapp',
    NULL,
    '🎬 Your Order is Ready!

Hi {{first_name}}, your {{service_type}} from {{celebrity_name}} is complete!

View it here: {{order_url}}',
    '["{{first_name}}", "{{service_type}}", "{{celebrity_name}}", "{{order_url}}"]'::jsonb,
    true
  ),
  (
    'Abandoned Cart Email',
    'email',
    'Complete Your Order? 🛒',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #7c3aed;">Complete Your Order? 🛒</h1>
      <p>Hi {{first_name}},</p>
      <p>You left something in your cart! Your booking with <strong>{{celebrity_name}}</strong> is waiting.</p>
      <a href="{{checkout_url}}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">Complete Order</a>
    </div>',
    '["{{first_name}}", "{{celebrity_name}}", "{{checkout_url}}"]'::jsonb,
    true
  ),
  (
    'New Subscriber Notification',
    'email',
    'You Have a New Subscriber! 🌟',
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #7c3aed;">New Subscriber Alert! 🌟</h1>
      <p>Hi {{celebrity_name}},</p>
      <p><strong>{{subscriber_name}}</strong> just subscribed to you!</p>
      <a href="https://wishmefinal.lovable.app/celebrity-dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">View Dashboard</a>
    </div>',
    '["{{celebrity_name}}", "{{subscriber_name}}"]'::jsonb,
    true
  ),
  (
    'New Subscriber WhatsApp',
    'whatsapp',
    NULL,
    '🌟 New Subscriber Alert!

Hi {{celebrity_name}}, {{subscriber_name}} just subscribed to you!

Check your dashboard: https://wishmefinal.lovable.app/celebrity-dashboard',
    '["{{celebrity_name}}", "{{subscriber_name}}"]'::jsonb,
    true
  );

-- Link templates to events
UPDATE public.message_events 
SET email_template_id = (SELECT id FROM public.message_templates WHERE name = 'Welcome Email' LIMIT 1),
    whatsapp_template_id = (SELECT id FROM public.message_templates WHERE name = 'Welcome WhatsApp' LIMIT 1)
WHERE event_key = 'USER_REGISTERED';

UPDATE public.message_events 
SET email_template_id = (SELECT id FROM public.message_templates WHERE name = 'New Subscriber Notification' LIMIT 1),
    whatsapp_template_id = (SELECT id FROM public.message_templates WHERE name = 'New Subscriber WhatsApp' LIMIT 1)
WHERE event_key = 'USER_SUBSCRIBED_CELEBRITY';

UPDATE public.message_events 
SET email_template_id = (SELECT id FROM public.message_templates WHERE name = 'Abandoned Cart Email' LIMIT 1)
WHERE event_key = 'PAYMENT_ABANDONED';

UPDATE public.message_events 
SET email_template_id = (SELECT id FROM public.message_templates WHERE name = 'Order Completed Email' LIMIT 1),
    whatsapp_template_id = (SELECT id FROM public.message_templates WHERE name = 'Order Completed WhatsApp' LIMIT 1)
WHERE event_key = 'ORDER_COMPLETED';

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_messaging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_messaging_updated_at();

CREATE TRIGGER update_message_events_updated_at
  BEFORE UPDATE ON public.message_events
  FOR EACH ROW EXECUTE FUNCTION public.update_messaging_updated_at();

CREATE TRIGGER update_messaging_settings_updated_at
  BEFORE UPDATE ON public.messaging_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_messaging_updated_at();

CREATE TRIGGER update_message_campaigns_updated_at
  BEFORE UPDATE ON public.message_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_messaging_updated_at();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_message_logs_channel ON public.message_logs(channel);
CREATE INDEX idx_message_logs_status ON public.message_logs(status);
CREATE INDEX idx_message_logs_sent_at ON public.message_logs(sent_at DESC);
CREATE INDEX idx_scheduled_messages_status ON public.scheduled_messages(status);
CREATE INDEX idx_scheduled_messages_scheduled_at ON public.scheduled_messages(scheduled_at);
CREATE INDEX idx_abandoned_cart_user ON public.abandoned_cart_tracking(user_id);
CREATE INDEX idx_abandoned_cart_completed ON public.abandoned_cart_tracking(checkout_completed);
CREATE INDEX idx_message_campaigns_status ON public.message_campaigns(status);