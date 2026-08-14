
-- =====================================================
-- Referral commission triggers for ALL order types
-- =====================================================

-- 1. VOICE CALL WISHES - trigger on completed calls
CREATE OR REPLACE FUNCTION process_voice_call_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  user_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  l1_commission integer;
  l2_commission integer;
  referrer_plan text;
  user_email text;
  order_amount integer;
BEGIN
  -- Only process when call_status changes to 'completed'
  IF NEW.call_status = 'completed' AND (OLD.call_status IS NULL OR OLD.call_status != 'completed') THEN
    order_amount := COALESCE(NEW.price_paid, 0);
    IF order_amount <= 0 THEN RETURN NEW; END IF;
    
    SELECT referred_by, email INTO user_referrer_id, user_email FROM public.profiles WHERE id = NEW.user_id;
    
    IF user_referrer_id IS NOT NULL THEN
      SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = user_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      l1_commission := (order_amount * COALESCE(l1_commission_pct, 5) / 100);
      
      IF l1_commission > 0 THEN
        INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
        VALUES (user_referrer_id, NEW.user_id, 1, l1_commission, 'completed');
        UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission WHERE id = user_referrer_id;
        INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (user_referrer_id, l1_commission, 'referral_commission', 'completed', 'L1 referral commission from ' || COALESCE(user_email, 'user') || ' voice call');
        
        SELECT referred_by INTO l2_referrer_id FROM public.profiles WHERE id = user_referrer_id;
        IF l2_referrer_id IS NOT NULL THEN
          SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = l2_referrer_id;
          SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
          l2_commission := (order_amount * COALESCE(l2_commission_pct, 2) / 100);
          IF l2_commission > 0 THEN
            INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.user_id, 2, l2_commission, 'completed');
            UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission WHERE id = l2_referrer_id;
            INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission, 'referral_commission', 'completed', 'L2 referral commission from ' || COALESCE(user_email, 'user') || ' voice call');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_voice_call_referral_commission ON voice_call_wishes;
CREATE TRIGGER trigger_voice_call_referral_commission
  AFTER UPDATE ON voice_call_wishes FOR EACH ROW
  EXECUTE FUNCTION process_voice_call_referral_commission();

-- 2. PHOTO WISHES - trigger on completed
CREATE OR REPLACE FUNCTION process_photo_wish_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  user_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  l1_commission integer;
  l2_commission integer;
  referrer_plan text;
  user_email text;
  order_amount integer;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    order_amount := COALESCE(NEW.amount_charged::integer, 0);
    IF order_amount <= 0 THEN RETURN NEW; END IF;
    
    SELECT referred_by, email INTO user_referrer_id, user_email FROM public.profiles WHERE id = NEW.user_id;
    
    IF user_referrer_id IS NOT NULL THEN
      SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = user_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      l1_commission := (order_amount * COALESCE(l1_commission_pct, 5) / 100);
      
      IF l1_commission > 0 THEN
        INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
        VALUES (user_referrer_id, NEW.user_id, 1, l1_commission, 'completed');
        UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission WHERE id = user_referrer_id;
        INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (user_referrer_id, l1_commission, 'referral_commission', 'completed', 'L1 referral commission from ' || COALESCE(user_email, 'user') || ' photo wish');
        
        SELECT referred_by INTO l2_referrer_id FROM public.profiles WHERE id = user_referrer_id;
        IF l2_referrer_id IS NOT NULL THEN
          SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = l2_referrer_id;
          SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
          l2_commission := (order_amount * COALESCE(l2_commission_pct, 2) / 100);
          IF l2_commission > 0 THEN
            INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.user_id, 2, l2_commission, 'completed');
            UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission WHERE id = l2_referrer_id;
            INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission, 'referral_commission', 'completed', 'L2 referral commission from ' || COALESCE(user_email, 'user') || ' photo wish');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_photo_wish_referral_commission ON photo_wishes;
CREATE TRIGGER trigger_photo_wish_referral_commission
  AFTER UPDATE ON photo_wishes FOR EACH ROW
  EXECUTE FUNCTION process_photo_wish_referral_commission();

-- 3. WISH CELEBRITY ORDERS - trigger on completed
CREATE OR REPLACE FUNCTION process_wish_celebrity_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  user_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  l1_commission integer;
  l2_commission integer;
  referrer_plan text;
  user_email text;
  order_amount integer;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    order_amount := COALESCE(NEW.amount_paid, 0);
    IF order_amount <= 0 THEN RETURN NEW; END IF;
    
    SELECT referred_by, email INTO user_referrer_id, user_email FROM public.profiles WHERE id = NEW.user_id;
    
    IF user_referrer_id IS NOT NULL THEN
      SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = user_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      l1_commission := (order_amount * COALESCE(l1_commission_pct, 5) / 100);
      
      IF l1_commission > 0 THEN
        INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
        VALUES (user_referrer_id, NEW.user_id, 1, l1_commission, 'completed');
        UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission WHERE id = user_referrer_id;
        INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (user_referrer_id, l1_commission, 'referral_commission', 'completed', 'L1 referral commission from ' || COALESCE(user_email, 'user') || ' wish celebrity order');
        
        SELECT referred_by INTO l2_referrer_id FROM public.profiles WHERE id = user_referrer_id;
        IF l2_referrer_id IS NOT NULL THEN
          SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = l2_referrer_id;
          SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
          l2_commission := (order_amount * COALESCE(l2_commission_pct, 2) / 100);
          IF l2_commission > 0 THEN
            INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.user_id, 2, l2_commission, 'completed');
            UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission WHERE id = l2_referrer_id;
            INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission, 'referral_commission', 'completed', 'L2 referral commission from ' || COALESCE(user_email, 'user') || ' wish celebrity order');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_wish_celebrity_referral_commission ON wish_celebrity_orders;
CREATE TRIGGER trigger_wish_celebrity_referral_commission
  AFTER UPDATE ON wish_celebrity_orders FOR EACH ROW
  EXECUTE FUNCTION process_wish_celebrity_referral_commission();

-- 4. MUSIC GENERATIONS - trigger on completed
CREATE OR REPLACE FUNCTION process_music_generation_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  user_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  l1_commission integer;
  l2_commission integer;
  referrer_plan text;
  user_email text;
  order_amount integer;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status::text != 'completed') THEN
    order_amount := COALESCE(NEW.credits_used, 0);
    IF order_amount <= 0 THEN RETURN NEW; END IF;
    
    SELECT referred_by, email INTO user_referrer_id, user_email FROM public.profiles WHERE id = NEW.user_id;
    
    IF user_referrer_id IS NOT NULL THEN
      SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = user_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      l1_commission := (order_amount * COALESCE(l1_commission_pct, 5) / 100);
      
      IF l1_commission > 0 THEN
        INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
        VALUES (user_referrer_id, NEW.user_id, 1, l1_commission, 'completed');
        UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission WHERE id = user_referrer_id;
        INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (user_referrer_id, l1_commission, 'referral_commission', 'completed', 'L1 referral commission from ' || COALESCE(user_email, 'user') || ' music generation');
        
        SELECT referred_by INTO l2_referrer_id FROM public.profiles WHERE id = user_referrer_id;
        IF l2_referrer_id IS NOT NULL THEN
          SELECT plan::text INTO referrer_plan FROM public.profiles WHERE id = l2_referrer_id;
          SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct FROM public.plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
          l2_commission := (order_amount * COALESCE(l2_commission_pct, 2) / 100);
          IF l2_commission > 0 THEN
            INSERT INTO public.referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.user_id, 2, l2_commission, 'completed');
            UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission WHERE id = l2_referrer_id;
            INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission, 'referral_commission', 'completed', 'L2 referral commission from ' || COALESCE(user_email, 'user') || ' music generation');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_music_generation_referral_commission ON music_generations;
CREATE TRIGGER trigger_music_generation_referral_commission
  AFTER UPDATE ON music_generations FOR EACH ROW
  EXECUTE FUNCTION process_music_generation_referral_commission();
