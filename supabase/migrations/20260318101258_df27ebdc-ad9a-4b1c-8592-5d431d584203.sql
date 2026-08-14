
-- Create user_activity_logs table
CREATE TABLE public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id uuid,
  user_email text,
  user_name text,
  user_role text,
  user_plan text,
  action_category text NOT NULL,
  action_type text NOT NULL,
  action_label text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  entity_type text,
  entity_id text,
  entity_label text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_activity_logs_category ON public.user_activity_logs(action_category);
CREATE INDEX idx_activity_logs_severity ON public.user_activity_logs(severity);
CREATE INDEX idx_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.user_activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read all logs
CREATE POLICY "Admins can read all activity logs"
ON public.user_activity_logs
FOR SELECT
TO authenticated
USING (public.is_admin_by_auth_uid());

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own activity logs"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add is_flagged to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_flagged'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_flagged boolean DEFAULT false;
  END IF;
END $$;
