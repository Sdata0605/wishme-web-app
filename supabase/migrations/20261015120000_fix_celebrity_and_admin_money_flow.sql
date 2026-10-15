-- Migration: Fix Celebrity and Admin Money Flow
-- Ensures celebrities and admin are properly credited across Voice Calls, Wish Orders, Subscriptions, and Bookings.

-- 1. Ensure foreign key constraint on booking_id is dropped so transactions can link to voice calls, wish orders, and subscriptions
ALTER TABLE public.celebrity_wallet_transactions
DROP CONSTRAINT IF EXISTS celebrity_wallet_transactions_booking_id_fkey;

-- 2. Add order_type column to celebrity_wallet_transactions for clean categorization
ALTER TABLE public.celebrity_wallet_transactions
ADD COLUMN IF NOT EXISTS order_type TEXT;

-- 3. Fix calculate_celebrity_commission_with_tds to avoid double TDS deduction
CREATE OR REPLACE FUNCTION public.calculate_celebrity_commission_with_tds()
RETURNS TRIGGER AS $$
DECLARE
  celebrity_commission_rate INTEGER;
  platform_tds_rate INTEGER;
  celebrity_pan_verified BOOLEAN;
  gross_commission NUMERIC;
  tds_amount NUMERIC;
  net_commission NUMERIC;
BEGIN
  -- If gross_amount and tds_amount are ALREADY populated by the caller, do NOT recalculate!
  IF NEW.gross_amount IS NOT NULL AND NEW.tds_amount IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get celebrity commission percentage
  SELECT commission_percentage INTO celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  IF celebrity_commission_rate IS NULL THEN
    celebrity_commission_rate := 70;
  END IF;
  
  -- Calculate gross commission from amount
  gross_commission := NEW.amount;
  
  -- Get celebrity's PAN verification status
  SELECT p.pan_verified INTO celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.celebrity_id;
  
  -- Get TDS rate
  IF celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO platform_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO platform_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_without_pan';
  END IF;
  
  -- Set default TDS rate if not found
  IF platform_tds_rate IS NULL THEN
    platform_tds_rate := CASE WHEN celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;
  
  -- Calculate TDS and net commission
  tds_amount := FLOOR(gross_commission * platform_tds_rate / 100);
  net_commission := gross_commission - tds_amount;
  
  -- Set values
  NEW.gross_amount := gross_commission;
  NEW.tds_percentage := platform_tds_rate;
  NEW.tds_amount := tds_amount;
  NEW.amount := net_commission;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Fix purchase_celebrity_subscription RPC for TDS and balance consistency
CREATE OR REPLACE FUNCTION public.purchase_celebrity_subscription(
  p_celebrity_id uuid,
  p_price integer,
  p_payment_method text DEFAULT 'wallet'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_profile_id uuid;
  v_wallet_balance integer;
  v_favorite_id uuid;
  v_celebrity_commission_pct integer;
  v_referrer_commission_pct integer;
  v_celebrity_commission integer;
  v_referrer_commission integer;
  v_pricing record;
  v_celebrity_pan_verified boolean;
  v_tds_rate integer;
  v_tds_amount integer;
  v_net_celebrity_commission integer;
  v_platform_fee integer;
BEGIN
  -- Get caller's profile
  SELECT id INTO v_user_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_user_profile_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check no duplicate active subscription
  IF EXISTS (
    SELECT 1 FROM celebrity_favorites 
    WHERE user_id = v_user_profile_id AND celebrity_id = p_celebrity_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Already subscribed to this celebrity';
  END IF;

  -- Validate pricing
  SELECT * INTO v_pricing FROM celebrity_favorite_pricing
  WHERE celebrity_id = p_celebrity_id AND is_enabled = true;
  
  IF v_pricing IS NULL THEN
    RAISE EXCEPTION 'Subscription not available for this celebrity';
  END IF;

  IF p_price != v_pricing.price THEN
    RAISE EXCEPTION 'Price mismatch. Expected %, got %', v_pricing.price, p_price;
  END IF;

  -- For wallet payment, validate balance
  IF p_payment_method = 'wallet' THEN
    SELECT wallet_balance INTO v_wallet_balance FROM profiles WHERE id = v_user_profile_id;
    IF COALESCE(v_wallet_balance, 0) < p_price THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  END IF;

  -- Calculate commissions
  v_referrer_commission_pct := COALESCE(v_pricing.referrer_commission_percentage, 10);
  v_celebrity_commission_pct := COALESCE(v_pricing.celebrity_commission_percentage, 5);
  v_referrer_commission := FLOOR(p_price * v_referrer_commission_pct / 100);
  v_celebrity_commission := FLOOR(p_price * v_celebrity_commission_pct / 100);

  -- Determine TDS rate
  SELECT p.pan_verified INTO v_celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = p_celebrity_id;

  IF v_celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO v_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO v_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_without_pan';
  END IF;

  IF v_tds_rate IS NULL THEN
    v_tds_rate := CASE WHEN v_celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;

  v_tds_amount := FLOOR(v_celebrity_commission * v_tds_rate / 100);
  v_net_celebrity_commission := v_celebrity_commission - v_tds_amount;
  v_platform_fee := p_price - v_celebrity_commission;

  -- Create the favorite (this triggers process_celebrity_favorite_referral_commission)
  INSERT INTO celebrity_favorites (
    user_id, celebrity_id, price_paid, 
    referrer_commission, celebrity_commission,
    payment_method, status, subscription_start_date, auto_renew
  ) VALUES (
    v_user_profile_id, p_celebrity_id, p_price,
    v_referrer_commission, v_celebrity_commission,
    p_payment_method, 'active', now(), false
  ) RETURNING id INTO v_favorite_id;

  -- Debit caller's wallet
  IF p_payment_method = 'wallet' THEN
    INSERT INTO wallet_transactions (
      user_id, transaction_type, amount, status, payment_method, description
    ) VALUES (
      v_user_profile_id, 'celebrity_subscription', p_price, 'completed', 'wallet',
      'Subscription to celebrity'
    );
  END IF;

  -- Credit celebrity earnings with full accounting ledger
  INSERT INTO celebrity_wallet_transactions (
    celebrity_id,
    booking_id,
    order_type,
    transaction_type,
    amount,
    gross_amount,
    tds_percentage,
    tds_amount,
    commission_percentage,
    platform_fee,
    description,
    status
  ) VALUES (
    p_celebrity_id,
    v_favorite_id,
    'subscription',
    'earning',
    v_net_celebrity_commission,
    v_celebrity_commission,
    v_tds_rate,
    v_tds_amount,
    v_celebrity_commission_pct,
    v_platform_fee,
    'Subscription commission from user',
    'completed'
  );

  -- Update celebrity balances with NET commission after TDS
  UPDATE celebrities 
  SET total_earnings = COALESCE(total_earnings, 0) + v_net_celebrity_commission,
      available_balance = COALESCE(available_balance, 0) + v_net_celebrity_commission
  WHERE id = p_celebrity_id;

  RETURN jsonb_build_object(
    'success', true,
    'favorite_id', v_favorite_id,
    'celebrity_commission', v_net_celebrity_commission,
    'platform_fee', v_platform_fee
  );
END;
$$;

-- 5. Trigger to credit celebrity earnings on completed voice calls
CREATE OR REPLACE FUNCTION public.credit_celebrity_on_voice_call_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_celebrity_commission_rate INTEGER;
  v_tds_rate INTEGER;
  v_celebrity_pan_verified BOOLEAN;
  v_gross_commission NUMERIC;
  v_tds_amount NUMERIC;
  v_net_commission NUMERIC;
  v_platform_fee NUMERIC;
BEGIN
  -- Only fire when call_status transitions to 'completed'
  IF NEW.call_status <> 'completed' OR (OLD IS NOT NULL AND OLD.call_status = 'completed') THEN
    RETURN NEW;
  END IF;

  -- Ensure celebrity_id exists and price is positive
  IF NEW.celebrity_id IS NULL OR COALESCE(NEW.price_paid, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  -- Idempotency check: skip if transaction already logged for this voice call
  IF EXISTS (
    SELECT 1 FROM celebrity_wallet_transactions 
    WHERE booking_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Get celebrity commission percentage (default 70%)
  SELECT commission_percentage INTO v_celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  IF v_celebrity_commission_rate IS NULL THEN
    v_celebrity_commission_rate := 70;
  END IF;

  v_gross_commission := FLOOR(NEW.price_paid * v_celebrity_commission_rate / 100);

  -- Get TDS rate based on PAN verification status
  SELECT p.pan_verified INTO v_celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.celebrity_id;

  IF v_celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO v_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO v_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_without_pan';
  END IF;

  IF v_tds_rate IS NULL THEN
    v_tds_rate := CASE WHEN v_celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;

  v_tds_amount := FLOOR(v_gross_commission * v_tds_rate / 100);
  v_net_commission := v_gross_commission - v_tds_amount;
  v_platform_fee := NEW.price_paid - v_gross_commission;

  -- Insert celebrity wallet transaction
  INSERT INTO celebrity_wallet_transactions (
    celebrity_id,
    booking_id,
    order_type,
    transaction_type,
    amount,
    gross_amount,
    tds_percentage,
    tds_amount,
    commission_percentage,
    platform_fee,
    description,
    status
  ) VALUES (
    NEW.celebrity_id,
    NEW.id,
    'voice_call',
    'earning',
    v_net_commission,
    v_gross_commission,
    v_tds_rate,
    v_tds_amount,
    v_celebrity_commission_rate,
    v_platform_fee,
    'Commission from voice call #' || LEFT(NEW.id::text, 8),
    'completed'
  );

  -- Update celebrity balances with net commission
  UPDATE celebrities
  SET 
    total_earnings = COALESCE(total_earnings, 0) + v_net_commission,
    available_balance = COALESCE(available_balance, 0) + v_net_commission
  WHERE id = NEW.celebrity_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_credit_celebrity_on_voice_call_complete ON public.voice_call_wishes;
CREATE TRIGGER trigger_credit_celebrity_on_voice_call_complete
  AFTER UPDATE ON public.voice_call_wishes
  FOR EACH ROW
  EXECUTE FUNCTION credit_celebrity_on_voice_call_complete();

-- 6. Trigger to credit celebrity earnings on completed wish celebrity orders
CREATE OR REPLACE FUNCTION public.credit_celebrity_on_wish_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_celebrity_commission_rate INTEGER;
  v_tds_rate INTEGER;
  v_celebrity_pan_verified BOOLEAN;
  v_gross_commission NUMERIC;
  v_tds_amount NUMERIC;
  v_net_commission NUMERIC;
  v_platform_fee NUMERIC;
  v_order_amount INTEGER;
BEGIN
  -- Only fire when payment_status transitions to 'completed'
  IF NEW.payment_status <> 'completed' OR (OLD IS NOT NULL AND OLD.payment_status = 'completed') THEN
    RETURN NEW;
  END IF;

  -- Ensure celebrity_id exists and order amount is positive
  IF NEW.celebrity_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_order_amount := COALESCE(NEW.amount_paid, 0);
  IF v_order_amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Idempotency check: skip if transaction already logged for this wish order
  IF EXISTS (
    SELECT 1 FROM celebrity_wallet_transactions 
    WHERE booking_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Get celebrity commission percentage (default 70%)
  SELECT commission_percentage INTO v_celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  IF v_celebrity_commission_rate IS NULL THEN
    v_celebrity_commission_rate := 70;
  END IF;

  v_gross_commission := FLOOR(v_order_amount * v_celebrity_commission_rate / 100);

  -- Get TDS rate based on PAN verification status
  SELECT p.pan_verified INTO v_celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.celebrity_id;

  IF v_celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO v_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO v_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_without_pan';
  END IF;

  IF v_tds_rate IS NULL THEN
    v_tds_rate := CASE WHEN v_celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;

  v_tds_amount := FLOOR(v_gross_commission * v_tds_rate / 100);
  v_net_commission := v_gross_commission - v_tds_amount;
  v_platform_fee := v_order_amount - v_gross_commission;

  -- Insert celebrity wallet transaction
  INSERT INTO celebrity_wallet_transactions (
    celebrity_id,
    booking_id,
    order_type,
    transaction_type,
    amount,
    gross_amount,
    tds_percentage,
    tds_amount,
    commission_percentage,
    platform_fee,
    description,
    status
  ) VALUES (
    NEW.celebrity_id,
    NEW.id,
    'wish_celebrity_order',
    'earning',
    v_net_commission,
    v_gross_commission,
    v_tds_rate,
    v_tds_amount,
    v_celebrity_commission_rate,
    v_platform_fee,
    'Commission from celebrity wish order #' || LEFT(NEW.id::text, 8),
    'completed'
  );

  -- Update celebrity balances with net commission
  UPDATE celebrities
  SET 
    total_earnings = COALESCE(total_earnings, 0) + v_net_commission,
    available_balance = COALESCE(available_balance, 0) + v_net_commission
  WHERE id = NEW.celebrity_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_credit_celebrity_on_wish_order_complete ON public.wish_celebrity_orders;
CREATE TRIGGER trigger_credit_celebrity_on_wish_order_complete
  AFTER UPDATE ON public.wish_celebrity_orders
  FOR EACH ROW
  EXECUTE FUNCTION credit_celebrity_on_wish_order_complete();

-- 7. Ensure calculate_booking_commission explicitly sets order_type = 'booking'
CREATE OR REPLACE FUNCTION public.calculate_booking_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  celebrity_commission_rate INTEGER;
  tds_rate INTEGER;
  celebrity_pan_verified BOOLEAN;
  gross_commission NUMERIC;
  tds_amount NUMERIC;
  net_commission NUMERIC;
  existing_transaction_count INTEGER;
  service_name TEXT;
BEGIN
  -- Get celebrity commission percentage
  SELECT commission_percentage INTO celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  -- Set default if not found
  IF celebrity_commission_rate IS NULL THEN
    celebrity_commission_rate := 70;
  END IF;
  
  -- Calculate gross commission
  gross_commission := (NEW.final_price * celebrity_commission_rate / 100);
  
  -- Get celebrity's PAN verification status
  SELECT p.pan_verified INTO celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.celebrity_id;
  
  -- Get appropriate TDS rate based on PAN verification
  IF celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO tds_rate
    FROM platform_settings
    WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO tds_rate
    FROM platform_settings
    WHERE setting_key = 'tds_rate_without_pan';
  END IF;
  
  -- Set default TDS rate if not found
  IF tds_rate IS NULL THEN
    tds_rate := CASE WHEN celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;
  
  -- Calculate TDS amount
  tds_amount := (gross_commission * tds_rate / 100);
  
  -- Calculate net commission after TDS
  net_commission := gross_commission - tds_amount;
  
  -- Set commission details on booking
  NEW.commission_percentage := celebrity_commission_rate;
  NEW.celebrity_commission := net_commission;
  NEW.platform_fee := NEW.final_price - gross_commission;
  
  service_name := NEW.service_type::text;
  
  -- Create wallet transaction when booking is CONFIRMED or COMPLETED
  IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending')) 
     OR (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
    
    -- Check if wallet transaction already exists for this booking
    SELECT COUNT(*) INTO existing_transaction_count
    FROM celebrity_wallet_transactions
    WHERE booking_id = NEW.id;
    
    IF existing_transaction_count = 0 THEN
      INSERT INTO celebrity_wallet_transactions (
        celebrity_id,
        booking_id,
        order_type,
        transaction_type,
        amount,
        gross_amount,
        tds_percentage,
        tds_amount,
        commission_percentage,
        platform_fee,
        description,
        status
      ) VALUES (
        NEW.celebrity_id,
        NEW.id,
        'booking',
        'earning',
        net_commission,
        gross_commission,
        tds_rate,
        tds_amount,
        celebrity_commission_rate,
        NEW.platform_fee,
        'Commission from ' || COALESCE(service_name, 'order') || ' #' || LEFT(NEW.id::text, 8),
        'completed'
      );
      
      -- Update celebrity earnings
      UPDATE celebrities 
      SET 
        total_earnings = COALESCE(total_earnings, 0) + net_commission,
        available_balance = COALESCE(available_balance, 0) + net_commission
      WHERE id = NEW.celebrity_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
