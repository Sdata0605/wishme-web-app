
-- Remove the foreign key constraint so booking_id can reference orders from any table
ALTER TABLE referral_transactions DROP CONSTRAINT referral_transactions_booking_id_fkey;

-- Add an order_type column to track which table the booking_id references
ALTER TABLE referral_transactions ADD COLUMN IF NOT EXISTS order_type TEXT;

-- Backfill existing records with order_type
UPDATE referral_transactions SET order_type = 'booking' WHERE order_type IS NULL;

-- Now insert the backfill record for the voice call order
INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
VALUES (
  '7d208134-22dc-4cb8-8388-9278ae6b6532',  -- admin@wishme.today (referrer)
  '1d294c5d-74c9-46b7-95bd-e43ea155b523',  -- admin@rockstar.com (referred)
  'a6826b61-5bb9-48f3-b3ac-60becdf55c7e',  -- latest voice call order id
  25,  -- 5% of ₹500
  1,
  'completed',
  'voice_call_wish'
);

-- Update admin@wishme.today wallet balance
UPDATE profiles 
SET wallet_balance = COALESCE(wallet_balance, 0) + 25
WHERE id = '7d208134-22dc-4cb8-8388-9278ae6b6532';

-- Record wallet transaction
INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
VALUES (
  '7d208134-22dc-4cb8-8388-9278ae6b6532',
  25,
  'referral_commission',
  'completed',
  'L1 referral commission from voice call order (backfill)'
);
