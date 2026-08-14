-- Fix the booking referral commission trigger to use correct column name (final_price instead of price)
CREATE OR REPLACE FUNCTION process_user_booking_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_l2_referrer_id UUID;
  v_order_amount INTEGER;
  v_l1_rate NUMERIC;
  v_l2_rate NUMERIC;
  v_l1_commission INTEGER;
  v_l2_commission INTEGER;
  v_referrer_plan TEXT;
BEGIN
  -- Only process on confirmed or completed status
  IF NEW.status NOT IN ('confirmed', 'completed') THEN 
    RETURN NEW; 
  END IF;
  
  -- Skip if already processed (old status was also confirmed/completed)
  IF OLD IS NOT NULL AND OLD.status IN ('confirmed', 'completed') THEN
    RETURN NEW;
  END IF;

  -- FIX: Changed from NEW.price to NEW.final_price (correct column name)
  v_order_amount := COALESCE(NEW.final_price, 0);
  IF v_order_amount <= 0 THEN 
    RETURN NEW; 
  END IF;

  -- Get L1 referrer from profiles
  SELECT referred_by INTO v_referrer_id
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_referrer_id IS NULL THEN 
    RETURN NEW; 
  END IF;

  -- Get referrer's plan for commission rates
  SELECT plan INTO v_referrer_plan
  FROM profiles
  WHERE user_id = v_referrer_id;

  -- Set commission rates based on referrer's plan
  CASE v_referrer_plan
    WHEN 'elite' THEN
      v_l1_rate := 0.10;
      v_l2_rate := 0.05;
    WHEN 'premium' THEN
      v_l1_rate := 0.08;
      v_l2_rate := 0.03;
    ELSE
      v_l1_rate := 0.05;
      v_l2_rate := 0.02;
  END CASE;

  -- Calculate L1 commission
  v_l1_commission := FLOOR(v_order_amount * v_l1_rate);

  IF v_l1_commission > 0 THEN
    -- Record L1 transaction
    INSERT INTO referral_transactions (
      referrer_id, referred_id, order_id, order_type, 
      commission_amount, commission_level, status
    ) VALUES (
      v_referrer_id, NEW.user_id, NEW.id::TEXT, 'booking',
      v_l1_commission, 1, 'completed'
    );

    -- Credit L1 referrer's wallet
    UPDATE profiles
    SET wallet_balance = COALESCE(wallet_balance, 0) + v_l1_commission
    WHERE user_id = v_referrer_id;

    -- Record wallet transaction
    INSERT INTO wallet_transactions (
      user_id, amount, transaction_type, description, status
    ) VALUES (
      v_referrer_id, v_l1_commission, 'referral_commission',
      'L1 commission from booking order', 'completed'
    );
  END IF;

  -- Get L2 referrer
  SELECT referred_by INTO v_l2_referrer_id
  FROM profiles
  WHERE user_id = v_referrer_id;

  IF v_l2_referrer_id IS NOT NULL THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate);

    IF v_l2_commission > 0 THEN
      -- Record L2 transaction
      INSERT INTO referral_transactions (
        referrer_id, referred_id, order_id, order_type,
        commission_amount, commission_level, status
      ) VALUES (
        v_l2_referrer_id, NEW.user_id, NEW.id::TEXT, 'booking',
        v_l2_commission, 2, 'completed'
      );

      -- Credit L2 referrer's wallet
      UPDATE profiles
      SET wallet_balance = COALESCE(wallet_balance, 0) + v_l2_commission
      WHERE user_id = v_l2_referrer_id;

      -- Record wallet transaction
      INSERT INTO wallet_transactions (
        user_id, amount, transaction_type, description, status
      ) VALUES (
        v_l2_referrer_id, v_l2_commission, 'referral_commission',
        'L2 commission from booking order', 'completed'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add webhook_url column to celebrities table for per-celebrity webhook configuration
ALTER TABLE celebrities ADD COLUMN IF NOT EXISTS webhook_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN celebrities.webhook_url IS 'Custom n8n webhook URL for this celebrity video generation';