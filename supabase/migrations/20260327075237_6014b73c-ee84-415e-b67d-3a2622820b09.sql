
CREATE POLICY "Authenticated users can insert own transactions"
  ON public.payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = public.get_my_profile_id());
