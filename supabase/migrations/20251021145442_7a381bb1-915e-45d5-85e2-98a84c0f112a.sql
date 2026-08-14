-- Fix wallet_transactions constraints to support new payment methods and transaction types

-- Drop and recreate the payment_method check constraint to include wallet and razorpay
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_payment_method_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_payment_method_check 
  CHECK (payment_method IN ('upi', 'bank_transfer', 'online', 'admin', 'wallet', 'razorpay'));

-- Drop and recreate the transaction_type check constraint to include all new types
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_transaction_type_check 
  CHECK (transaction_type IN (
    'deposit', 
    'withdrawal', 
    'admin_credit', 
    'music_generation', 
    'music_download', 
    'commission_earning',
    'greeting_card_generation',
    'celebrity_subscription',
    'ugc_video',
    'referral_commission'
  ));