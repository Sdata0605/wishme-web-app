
-- ============================================================
-- FIX 1: Drop 4 duplicate booking referral triggers
-- ============================================================
DROP TRIGGER IF EXISTS process_referral_commissions_trigger ON bookings;
DROP TRIGGER IF EXISTS trigger_booking_referral ON bookings;
DROP TRIGGER IF EXISTS trigger_user_booking_referral_commission ON bookings;
DROP TRIGGER IF EXISTS trigger_user_booking_referral_commission_insert ON bookings;

-- ============================================================
-- FIX 2: Drop the unused function with hardcoded rates
-- ============================================================
DROP FUNCTION IF EXISTS process_user_booking_referral_commission();

-- ============================================================
-- FIX 3: Replace process_referral_commissions() with duplicate protection
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_referral_commissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  l1_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  booking_amount integer;
  l1_commission_amount integer;
  l2_commission_amount integer;
  referrer_plan text;
BEGIN
  -- Process when booking status changes to 'confirmed' OR 'completed'
  IF (NEW.status = 'completed' OR NEW.status = 'confirmed') 
     AND (OLD.status IS NULL OR (OLD.status != 'completed' AND OLD.status != 'confirmed')) THEN
    
    -- DUPLICATE PROTECTION: Skip if commission already recorded for this booking
    IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1) THEN
      RETURN NEW;
    END IF;

    booking_amount := COALESCE(NEW.final_price, 0);
    
    IF booking_amount <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Check if user was referred by someone
    SELECT referred_by INTO l1_referrer_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    IF l1_referrer_id IS NOT NULL THEN
      -- Get L1 referrer's plan and commission percentage
      SELECT plan::text INTO referrer_plan
      FROM profiles
      WHERE id = l1_referrer_id;
      
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct
      FROM plans
      WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic'))
      LIMIT 1;
      
      l1_commission_pct := COALESCE(l1_commission_pct, 5);
      l1_commission_amount := (booking_amount * l1_commission_pct / 100);
      
      IF l1_commission_amount > 0 THEN
        INSERT INTO referral_transactions (
          referrer_id, referred_id, booking_id,
          commission_level, commission_amount, status
        ) VALUES (
          l1_referrer_id, NEW.user_id, NEW.id,
          1, l1_commission_amount, 'completed'
        );
        
        UPDATE profiles 
        SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission_amount
        WHERE id = l1_referrer_id;
        
        INSERT INTO wallet_transactions (
          user_id, amount, transaction_type, status, description
        ) VALUES (
          l1_referrer_id, l1_commission_amount, 'referral_commission', 
          'completed', 'Level 1 referral commission from booking #' || LEFT(NEW.id::text, 8)
        );
      END IF;
      
      -- Check for L2 referrer
      SELECT referred_by INTO l2_referrer_id
      FROM profiles
      WHERE id = l1_referrer_id;
      
      IF l2_referrer_id IS NOT NULL THEN
        SELECT plan::text INTO referrer_plan
        FROM profiles
        WHERE id = l2_referrer_id;
        
        SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct
        FROM plans
        WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic'))
        LIMIT 1;
        
        l2_commission_pct := COALESCE(l2_commission_pct, 2);
        
        IF l2_commission_pct > 0 THEN
          l2_commission_amount := (booking_amount * l2_commission_pct / 100);
          
          IF l2_commission_amount > 0 THEN
            INSERT INTO referral_transactions (
              referrer_id, referred_id, booking_id,
              commission_level, commission_amount, status
            ) VALUES (
              l2_referrer_id, NEW.user_id, NEW.id,
              2, l2_commission_amount, 'completed'
            );
            
            UPDATE profiles 
            SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission_amount
            WHERE id = l2_referrer_id;
            
            INSERT INTO wallet_transactions (
              user_id, amount, transaction_type, status, description
            ) VALUES (
              l2_referrer_id, l2_commission_amount, 'referral_commission', 
              'completed', 'Level 2 referral commission from booking #' || LEFT(NEW.id::text, 8)
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================================
-- FIX 4: Fix voice call trigger to only fire on completion
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_voice_call_referral_commission()
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
  -- Only fire when call_status changes TO 'completed'
  IF NEW.call_status <> 'completed' OR (OLD IS NOT NULL AND OLD.call_status = 'completed') THEN
    RETURN NEW;
  END IF;

  -- Duplicate protection
  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'voice_call_wish') THEN
    RETURN NEW;
  END IF;

  v_order_amount := COALESCE(NEW.price_paid, 0);
  IF v_order_amount <= 0 THEN RETURN NEW; END IF;

  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = NEW.user_id;
  IF v_referrer_id IS NULL THEN RETURN NEW; END IF;

  SELECT p.plan INTO v_referrer_plan FROM profiles p WHERE p.id = v_referrer_id;
  SELECT referral_commission_l1, referral_commission_l2 INTO v_l1_rate, v_l2_rate
  FROM plans WHERE LOWER(name) = LOWER(COALESCE(v_referrer_plan, 'basic'));

  v_l1_rate := COALESCE(v_l1_rate, 5);
  v_l2_rate := COALESCE(v_l2_rate, 2);
  v_l1_commission := FLOOR(v_order_amount * v_l1_rate / 100);

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'voice_call_wish');
    UPDATE profiles SET wallet_balance = COALESCE(wallet_balance, 0) + v_l1_commission WHERE id = v_referrer_id;
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from voice call order');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'voice_call_wish');
      UPDATE profiles SET wallet_balance = COALESCE(wallet_balance, 0) + v_l2_commission WHERE id = v_l2_referrer_id;
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from voice call order');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================================
-- FIX 5: Dynamic referral URL from platform_settings
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_referral_url(profile_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_code text;
  base_url text;
BEGIN
  SELECT referral_code INTO ref_code
  FROM profiles
  WHERE id = profile_id;
  
  -- Read platform URL from settings, fallback to wishme.today
  SELECT setting_value INTO base_url
  FROM platform_settings
  WHERE setting_key = 'platform_url';
  
  base_url := COALESCE(base_url, 'https://wishme.today');
  
  RETURN base_url || '/auth?ref=' || ref_code;
END;
$function$;

-- Ensure platform_url setting exists
INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('platform_url', 'https://wishme.today')
ON CONFLICT (setting_key) DO NOTHING;
