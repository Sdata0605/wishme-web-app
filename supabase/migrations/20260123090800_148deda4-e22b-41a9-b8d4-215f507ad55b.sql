-- Drop and recreate the check constraint with all valid transaction types
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY[
  'deposit', 
  'withdrawal', 
  'admin_credit', 
  'music_generation', 
  'music_download', 
  'greeting_card_generation', 
  'celebrity_subscription', 
  'ugc_video', 
  'image_promotion', 
  'booking', 
  'referral_commission',
  'earning',
  'favorite_subscription',
  'photo_wish',
  'celebrity_call',
  'voice_call',
  'plan_upgrade',
  'service_payment',
  'debit'
]));