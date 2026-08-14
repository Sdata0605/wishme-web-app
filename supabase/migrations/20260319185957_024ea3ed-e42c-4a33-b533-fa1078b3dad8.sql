
-- ============================================================
-- BUG FIX 1: Fix Double TDS — skip recalculation when already set
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_celebrity_commission_with_tds()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  celebrity_commission_rate INTEGER;
  platform_tds_rate INTEGER;
  celebrity_pan_verified BOOLEAN;
  gross_commission NUMERIC;
  tds_amount NUMERIC;
  net_commission NUMERIC;
BEGIN
  -- If TDS is already calculated (e.g. from calculate_booking_commission), pass through
  IF NEW.tds_percentage IS NOT NULL AND NEW.tds_percentage > 0 
     AND NEW.tds_amount IS NOT NULL AND NEW.tds_amount > 0 THEN
    RETURN NEW;
  END IF;

  -- Get celebrity commission percentage
  SELECT commission_percentage INTO celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  IF celebrity_commission_rate IS NULL THEN
    celebrity_commission_rate := 70;
  END IF;
  
  gross_commission := NEW.amount;
  
  SELECT p.pan_verified INTO celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.celebrity_id;
  
  IF celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO platform_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO platform_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_without_pan';
  END IF;
  
  IF platform_tds_rate IS NULL THEN
    platform_tds_rate := CASE WHEN celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;
  
  tds_amount := (gross_commission * platform_tds_rate / 100);
  net_commission := gross_commission - tds_amount;
  
  NEW.gross_amount := gross_commission;
  NEW.tds_percentage := platform_tds_rate;
  NEW.tds_amount := tds_amount;
  NEW.amount := net_commission;
  
  RETURN NEW;
END;
$function$;

-- ============================================================
-- BUG FIX 2: Fix Double Referral Credit — remove direct UPDATE profiles
-- ============================================================

-- Fix process_referral_commissions
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
  IF (NEW.status = 'completed' OR NEW.status = 'confirmed') 
     AND (OLD.status IS NULL OR (OLD.status != 'completed' AND OLD.status != 'confirmed')) THEN
    
    IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1) THEN
      RETURN NEW;
    END IF;

    booking_amount := COALESCE(NEW.final_price, 0);
    IF booking_amount <= 0 THEN RETURN NEW; END IF;
    
    SELECT referred_by INTO l1_referrer_id FROM profiles WHERE id = NEW.user_id;
    
    IF l1_referrer_id IS NOT NULL THEN
      SELECT plan::text INTO referrer_plan FROM profiles WHERE id = l1_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct
      FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      
      l1_commission_pct := COALESCE(l1_commission_pct, 5);
      l1_commission_amount := (booking_amount * l1_commission_pct / 100);
      
      IF l1_commission_amount > 0 THEN
        INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_level, commission_amount, status)
        VALUES (l1_referrer_id, NEW.user_id, NEW.id, 1, l1_commission_amount, 'completed');
        
        INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (l1_referrer_id, l1_commission_amount, 'referral_commission', 'completed', 
                'Level 1 referral commission from booking #' || LEFT(NEW.id::text, 8));
      END IF;
      
      SELECT referred_by INTO l2_referrer_id FROM profiles WHERE id = l1_referrer_id;
      
      IF l2_referrer_id IS NOT NULL THEN
        SELECT plan::text INTO referrer_plan FROM profiles WHERE id = l2_referrer_id;
        SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct
        FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
        
        l2_commission_pct := COALESCE(l2_commission_pct, 2);
        
        IF l2_commission_pct > 0 THEN
          l2_commission_amount := (booking_amount * l2_commission_pct / 100);
          IF l2_commission_amount > 0 THEN
            INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.user_id, NEW.id, 2, l2_commission_amount, 'completed');
            
            INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission_amount, 'referral_commission', 'completed', 
                    'Level 2 referral commission from booking #' || LEFT(NEW.id::text, 8));
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix process_voice_call_referral_commission
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
  IF NEW.call_status <> 'completed' OR (OLD IS NOT NULL AND OLD.call_status = 'completed') THEN
    RETURN NEW;
  END IF;

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
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from voice call order');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'voice_call_wish');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from voice call order');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix process_photo_wish_referral_commission
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
  v_order_amount := COALESCE(NEW.price_paid, 0);
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

-- Fix process_wish_celebrity_referral_commission
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
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  v_order_amount := COALESCE(NEW.total_amount, 0);
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
  v_l1_commission := FLOOR(v_order_amount * v_l1_rate / 100);

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'wish_celebrity_order');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from wish celebrity order');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'wish_celebrity_order');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from wish celebrity order');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix process_music_generation_referral_commission
CREATE OR REPLACE FUNCTION public.process_music_generation_referral_commission()
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
  v_order_amount := COALESCE(NEW.price_paid, 0);
  IF v_order_amount <= 0 THEN RETURN NEW; END IF;

  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = NEW.user_id;
  IF v_referrer_id IS NULL THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'music_generation') THEN
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
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'music_generation');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from music generation');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'music_generation');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from music generation');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Also fix process_plan_referral_commission (has same double-credit bug)
CREATE OR REPLACE FUNCTION public.process_plan_referral_commission()
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
  plan_amount integer;
  l1_commission integer;
  l2_commission integer;
  referrer_plan text;
BEGIN
  IF OLD.plan = 'basic' AND (NEW.plan = 'premium' OR NEW.plan = 'elite') THEN
    
    SELECT price INTO plan_amount FROM plans WHERE LOWER(name) = LOWER(NEW.plan::text) LIMIT 1;
    IF plan_amount IS NULL OR plan_amount <= 0 THEN RETURN NEW; END IF;
    
    IF NEW.referred_by IS NOT NULL THEN
      l1_referrer_id := NEW.referred_by;
      
      SELECT plan::text INTO referrer_plan FROM profiles WHERE id = l1_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct
      FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      
      l1_commission := (plan_amount * COALESCE(l1_commission_pct, 5) / 100);
      
      IF l1_commission > 0 THEN
        INSERT INTO referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
        VALUES (l1_referrer_id, NEW.id, 1, l1_commission, 'completed');
        
        INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (l1_referrer_id, l1_commission, 'referral_commission', 'completed', 
                'L1 referral commission from ' || NEW.email || ' plan upgrade to ' || NEW.plan::text);
        
        SELECT referred_by INTO l2_referrer_id FROM profiles WHERE id = l1_referrer_id;
        
        IF l2_referrer_id IS NOT NULL THEN
          SELECT plan::text INTO referrer_plan FROM profiles WHERE id = l2_referrer_id;
          SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct
          FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
          
          l2_commission := (plan_amount * COALESCE(l2_commission_pct, 2) / 100);
          
          IF l2_commission > 0 THEN
            INSERT INTO referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.id, 2, l2_commission, 'completed');
            
            INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission, 'referral_commission', 'completed',
                    'L2 referral commission from ' || NEW.email || ' plan upgrade to ' || NEW.plan::text);
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ============================================================
-- BUG FIX 3: Add image_promotions referral trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_image_promotion_referral_commission()
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
  IF NEW.status <> 'completed' OR (OLD IS NOT NULL AND OLD.status = 'completed') THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'image_promotion') THEN
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
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'image_promotion');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from image promotion');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'image_promotion');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from image promotion');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_image_promotion_referral_commission ON image_promotions;
CREATE TRIGGER trigger_image_promotion_referral_commission
  AFTER UPDATE ON image_promotions
  FOR EACH ROW
  EXECUTE FUNCTION process_image_promotion_referral_commission();

-- ============================================================
-- BUG FIX 4: Add celebrity_favorites referral trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_celebrity_favorite_referral_commission()
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
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM referral_transactions WHERE booking_id = NEW.id AND commission_level = 1 AND order_type = 'celebrity_favorite') THEN
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
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'celebrity_favorite');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from celebrity subscription');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := FLOOR(v_order_amount * v_l2_rate / 100);
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'celebrity_favorite');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from celebrity subscription');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_celebrity_favorite_referral_commission ON celebrity_favorites;
CREATE TRIGGER trigger_celebrity_favorite_referral_commission
  AFTER INSERT ON celebrity_favorites
  FOR EACH ROW
  EXECUTE FUNCTION process_celebrity_favorite_referral_commission();

-- ============================================================
-- NEW FEATURE: Create payout_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  celebrity_id UUID NOT NULL REFERENCES celebrities(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  requested_amount INTEGER NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id)
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Celebrity can view their own payout requests
CREATE POLICY "Celebrities can view own payout requests"
  ON public.payout_requests FOR SELECT
  USING (profile_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

-- Celebrity can create payout requests
CREATE POLICY "Celebrities can create payout requests"
  ON public.payout_requests FOR INSERT
  WITH CHECK (profile_id = public.get_my_profile_id());

-- Admin can update payout requests
CREATE POLICY "Admin can update payout requests"
  ON public.payout_requests FOR UPDATE
  USING (public.is_admin_by_auth_uid());
