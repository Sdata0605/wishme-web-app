CREATE OR REPLACE FUNCTION public.process_wish_celebrity_referral_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- FIX: Check payment_status instead of status (status never equals 'completed')
  IF NEW.payment_status <> 'completed' THEN RETURN NEW; END IF;
  IF OLD IS NOT NULL AND OLD.payment_status = 'completed' THEN RETURN NEW; END IF;
  
  -- FIX: Use amount_paid instead of total_amount (total_amount doesn't exist)
  v_order_amount := COALESCE(NEW.amount_paid, 0);
  IF v_order_amount <= 0 THEN RETURN NEW; END IF;

  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = NEW.user_id;
  IF v_referrer_id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'wish_celebrity_order') THEN
    RETURN NEW;
  END IF;

  SELECT p.plan INTO v_referrer_plan FROM profiles p WHERE p.id = v_referrer_id;
  SELECT referral_commission_l1, referral_commission_l2 INTO v_l1_rate, v_l2_rate
  FROM plans WHERE LOWER(name) = LOWER(COALESCE(v_referrer_plan, 'basic'));

  v_l1_rate := COALESCE(v_l1_rate, 5);
  v_l2_rate := COALESCE(v_l2_rate, 2);
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'wish_celebrity_order');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from celebrity wish order');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'wish_celebrity_order');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from celebrity wish order');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;