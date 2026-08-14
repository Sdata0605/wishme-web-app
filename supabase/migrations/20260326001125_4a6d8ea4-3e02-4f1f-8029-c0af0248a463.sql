
-- Step 1: Add price_paid column to music_generations
ALTER TABLE public.music_generations ADD COLUMN IF NOT EXISTS price_paid integer;

-- Step 2: Create greeting card referral commission trigger function
CREATE OR REPLACE FUNCTION public.process_greeting_card_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'greeting_card') THEN
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
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'greeting_card');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from greeting card');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'greeting_card');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from greeting card');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_greeting_card_referral_commission ON greeting_card_generations;
CREATE TRIGGER trg_greeting_card_referral_commission
  AFTER INSERT OR UPDATE ON greeting_card_generations
  FOR EACH ROW
  EXECUTE FUNCTION process_greeting_card_referral_commission();

-- Step 3: Create UGC video referral commission trigger function
CREATE OR REPLACE FUNCTION public.process_ugc_video_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  v_order_amount := COALESCE(NEW.price_paid, 0);
  IF v_order_amount <= 0 THEN RETURN NEW; END IF;

  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = NEW.user_id;
  IF v_referrer_id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'ugc_video') THEN
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
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'ugc_video');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from UGC video');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'ugc_video');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from UGC video');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ugc_video_referral_commission ON ugc_video_generations;
CREATE TRIGGER trg_ugc_video_referral_commission
  AFTER INSERT OR UPDATE ON ugc_video_generations
  FOR EACH ROW
  EXECUTE FUNCTION process_ugc_video_referral_commission();

-- Step 4: Create notification trigger on wallet_transactions for referral commissions
CREATE OR REPLACE FUNCTION public.notify_referral_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_email TEXT;
  v_referrer_name TEXT;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  IF NEW.transaction_type <> 'referral_commission' THEN
    RETURN NEW;
  END IF;

  SELECT p.email, COALESCE(p.first_name, 'User') INTO v_referrer_email, v_referrer_name
  FROM profiles p WHERE p.id = NEW.user_id;

  IF v_referrer_email IS NULL THEN RETURN NEW; END IF;

  v_supabase_url := 'https://eqikeuqwbphwongtfzhe.supabase.co';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_service_role_key'
  LIMIT 1;

  IF v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-referral-earning-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'referrer_email', v_referrer_email,
        'referrer_name', v_referrer_name,
        'amount', NEW.amount,
        'description', NEW.description
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_referral_earning ON wallet_transactions;
CREATE TRIGGER trg_notify_referral_earning
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_referral_earning();
