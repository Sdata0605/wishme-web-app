
-- Fix the broken trigger function that references wrong column name
CREATE OR REPLACE FUNCTION public.process_photo_wish_referral_commission()
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
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  v_order_amount := COALESCE(NEW.amount_charged, 0);
  IF v_order_amount <= 0 THEN RETURN NEW; END IF;

  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = NEW.user_id;
  IF v_referrer_id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'photo_wish') THEN
    RETURN NEW;
  END IF;

  SELECT p.plan INTO v_referrer_plan FROM profiles p WHERE p.id = v_referrer_id;
  SELECT referral_commission_l1, referral_commission_l2 INTO v_l1_rate, v_l2_rate
  FROM plans WHERE LOWER(name) = LOWER(COALESCE(v_referrer_plan, 'basic'));

  v_l1_rate := COALESCE(v_l1_rate, 5);
  v_l2_rate := COALESCE(v_l2_rate, 2);
  v_l1_commission := FLOOR(v_order_amount * v_l1_rate / 100);

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'photo_wish');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from photo wish');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'photo_wish');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from photo wish');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Now clean up bloated data
UPDATE greeting_card_generations 
SET generated_image_url = 'data:cleaned' 
WHERE generated_image_url IS NOT NULL AND length(generated_image_url) > 10000;

UPDATE greeting_card_generations 
SET reference_image_url = NULL 
WHERE reference_image_url IS NOT NULL AND length(reference_image_url) > 10000;

UPDATE photo_wishes 
SET edited_image_url = 'data:cleaned' 
WHERE edited_image_url IS NOT NULL AND length(edited_image_url) > 10000;

UPDATE photo_wishes 
SET original_image_url = 'truncated' 
WHERE original_image_url IS NOT NULL AND length(original_image_url) > 10000;
