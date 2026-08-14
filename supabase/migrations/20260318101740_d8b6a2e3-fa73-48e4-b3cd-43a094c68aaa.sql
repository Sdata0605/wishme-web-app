
-- Create internal_alert_recipients table
CREATE TABLE public.internal_alert_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  whatsapp text,
  role_tag text NOT NULL DEFAULT 'Admin',
  channels jsonb NOT NULL DEFAULT '{"email": true, "sms": false, "whatsapp": false}'::jsonb,
  alert_types jsonb NOT NULL DEFAULT '{"api_failure": true, "critical_bug": true, "edge_function_error": true, "manual_broadcast": true, "security_alert": true}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only admins
ALTER TABLE public.internal_alert_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alert recipients"
ON public.internal_alert_recipients
FOR ALL
TO authenticated
USING (public.is_admin_by_auth_uid())
WITH CHECK (public.is_admin_by_auth_uid());
