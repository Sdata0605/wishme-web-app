-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON wallet_transactions;
DROP FUNCTION IF EXISTS update_wallet_balance();

-- Create improved trigger function that handles all wallet transaction scenarios
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT with 'completed' status (admin credits, approved payments)
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
    IF NEW.transaction_type IN ('deposit', 'admin_credit', 'referral_commission') THEN
      -- Credit wallet
      UPDATE profiles 
      SET wallet_balance = wallet_balance + NEW.amount
      WHERE id = NEW.user_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'music_generation', 'music_download', 'greeting_card_generation', 'celebrity_subscription', 'ugc_video') THEN
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
    IF NEW.transaction_type IN ('withdrawal', 'music_generation', 'music_download', 'greeting_card_generation', 'celebrity_subscription', 'ugc_video') THEN
      -- Debit wallet
      UPDATE profiles 
      SET wallet_balance = wallet_balance - NEW.amount
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for BOTH INSERT and UPDATE
CREATE TRIGGER trigger_update_wallet_balance
  BEFORE INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- Recalculate all wallet balances from transaction history to fix existing discrepancies
UPDATE profiles p
SET wallet_balance = COALESCE((
  SELECT SUM(
    CASE 
      WHEN wt.transaction_type IN ('deposit', 'admin_credit', 'referral_commission') 
      THEN wt.amount
      WHEN wt.transaction_type IN ('withdrawal', 'music_generation', 'music_download', 'greeting_card_generation', 'celebrity_subscription', 'ugc_video')
      THEN -wt.amount
      ELSE 0
    END
  )
  FROM wallet_transactions wt
  WHERE wt.user_id = p.id 
    AND wt.status = 'completed'
), 0);