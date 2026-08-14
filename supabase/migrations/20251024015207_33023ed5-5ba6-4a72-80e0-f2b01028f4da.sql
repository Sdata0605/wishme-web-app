-- Add 'booking' and 'image_promotion' to wallet transaction type constraint
ALTER TABLE wallet_transactions 
DROP CONSTRAINT IF EXISTS wallet_transactions_transaction_type_check;

ALTER TABLE wallet_transactions
ADD CONSTRAINT wallet_transactions_transaction_type_check
CHECK (transaction_type IN (
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
  'referral_commission'
));

-- Update trigger to handle 'booking' and 'image_promotion' as debit types
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT with 'completed' status (admin credits, approved payments)
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    IF NEW.transaction_type IN ('deposit', 'admin_credit', 'referral_commission') THEN
      -- Credit wallet
      UPDATE profiles 
      SET wallet_balance = wallet_balance + NEW.amount
      WHERE id = NEW.user_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'music_generation', 'music_download', 'greeting_card_generation', 'celebrity_subscription', 'ugc_video', 'image_promotion', 'booking') THEN
      -- Debit wallet
      UPDATE profiles 
      SET wallet_balance = wallet_balance - NEW.amount
      WHERE id = NEW.user_id;
    END IF;
  END IF;

  -- Handle UPDATE from 'pending' to 'approved' (admin approval workflow)
  IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status = 'pending') THEN
    -- Credit wallet
    UPDATE profiles 
    SET wallet_balance = wallet_balance + NEW.amount
    WHERE id = NEW.user_id;
    
    -- Auto-mark as completed
    NEW.status := 'completed';
    NEW.processed_at := NOW();
  END IF;
  
  -- Handle UPDATE to 'completed' for deductions
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    IF NEW.transaction_type IN ('withdrawal', 'music_generation', 'music_download', 'greeting_card_generation', 'celebrity_subscription', 'ugc_video', 'image_promotion', 'booking') THEN
      -- Debit wallet
      UPDATE profiles 
      SET wallet_balance = wallet_balance - NEW.amount
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;