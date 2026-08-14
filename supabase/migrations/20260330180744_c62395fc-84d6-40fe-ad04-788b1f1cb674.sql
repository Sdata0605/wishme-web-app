
CREATE TABLE public.user_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_amount INTEGER NOT NULL,
  bank_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.user_withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests"
  ON public.user_withdrawal_requests FOR SELECT
  TO authenticated
  USING (profile_id = public.get_my_profile_id());

CREATE POLICY "Users can create withdrawal requests"
  ON public.user_withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all withdrawal requests"
  ON public.user_withdrawal_requests FOR ALL
  TO authenticated
  USING (public.is_admin_by_auth_uid());
