-- Fix notify_referral_earning to use anon key (vault secret was missing)
CREATE OR REPLACE FUNCTION public.notify_referral_earning()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_email TEXT;
  v_referrer_name TEXT;
  v_supabase_url TEXT;
  v_anon_key TEXT;
BEGIN
  IF NEW.transaction_type <> 'referral_commission' THEN
    RETURN NEW;
  END IF;

  SELECT p.email, COALESCE(p.first_name, 'User') INTO v_referrer_email, v_referrer_name
  FROM profiles p WHERE p.id = NEW.user_id;

  IF v_referrer_email IS NULL THEN RETURN NEW; END IF;

  v_supabase_url := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-referral-earning-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    ),
    body := jsonb_build_object(
      'referrer_email', v_referrer_email,
      'referrer_name', v_referrer_name,
      'amount', NEW.amount,
      'description', NEW.description
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- Update all referral triggers to use GREATEST(1, ...) for minimum ₹1 commission
-- and add proper OLD status checks to prevent re-firing

-- Greeting card
CREATE OR REPLACE FUNCTION public.process_greeting_card_referral_commission()
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
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  
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
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'greeting_card');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from greeting card');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'greeting_card');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from greeting card');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Music generation
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
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  
  v_order_amount := COALESCE(NEW.price_paid, 0);
  IF v_order_amount <= 0 THEN
    v_order_amount := COALESCE(NEW.credits_used, 1) * 150;
  END IF;
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
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'music_generation');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from AI music generation');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'music_generation');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from AI music generation');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- UGC video
CREATE OR REPLACE FUNCTION public.process_ugc_video_referral_commission()
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
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  
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
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'ugc_video');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from UGC video');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'ugc_video');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from UGC video');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Photo wish
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
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  
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
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'photo_wish');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from photo wish');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
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

-- Voice call wish
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
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'voice_call_wish');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from celebrity voice call');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
    IF v_l2_commission > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2_referrer_id, NEW.user_id, NEW.id, v_l2_commission, 2, 'completed', 'voice_call_wish');
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2_referrer_id, v_l2_commission, 'referral_commission', 'completed', 'L2 referral commission from celebrity voice call');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Image promotion
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
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'image_promotion');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from image promotion');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
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

-- Wish celebrity orders
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
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN RETURN NEW; END IF;
  
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

-- Celebrity favorites
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
  v_l1_commission := GREATEST(1, FLOOR(v_order_amount * v_l1_rate / 100));

  IF v_l1_commission > 0 THEN
    INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
    VALUES (v_referrer_id, NEW.user_id, NEW.id, v_l1_commission, 1, 'completed', 'celebrity_favorite');
    INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
    VALUES (v_referrer_id, v_l1_commission, 'referral_commission', 'completed', 'L1 referral commission from celebrity subscription');
  END IF;

  SELECT referred_by INTO v_l2_referrer_id FROM profiles WHERE id = v_referrer_id;
  IF v_l2_referrer_id IS NOT NULL AND v_l2_rate > 0 THEN
    v_l2_commission := GREATEST(1, FLOOR(v_order_amount * v_l2_rate / 100));
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