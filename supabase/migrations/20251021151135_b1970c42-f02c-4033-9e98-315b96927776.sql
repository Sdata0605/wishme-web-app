-- Extend celebrity_wallet_transactions transaction_type to support favorites and UGC flows
ALTER TABLE public.celebrity_wallet_transactions 
  DROP CONSTRAINT IF EXISTS celebrity_wallet_transactions_transaction_type_check;

ALTER TABLE public.celebrity_wallet_transactions 
  ADD CONSTRAINT celebrity_wallet_transactions_transaction_type_check 
  CHECK (
    transaction_type IN (
      'earning',
      'withdrawal',
      'bonus',
      'penalty',
      'favorite_subscription',
      'ugc_commission',
      'image_promotion_commission',
      'video_promotion_commission'
    )
  );