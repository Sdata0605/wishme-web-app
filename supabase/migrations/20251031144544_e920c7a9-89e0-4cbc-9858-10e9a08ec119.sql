-- Allow users to insert debit wallet transactions for their own account when status is 'completed'
-- This enables app-driven deductions like bookings, greeting cards, etc.
CREATE POLICY "Users can create their own debit transactions"
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
  AND transaction_type IN (
    'booking',
    'greeting_card_generation',
    'image_promotion',
    'ugc_video',
    'music_generation',
    'music_download',
    'celebrity_subscription'
  )
  AND status = 'completed'
);

-- Optional: ensure description cannot be null for audit clarity
-- (no schema change here, just relying on app to provide description)
