-- Referral fixes found in the QA audit and an end-to-end test of the backend.
--  1. A new profile never got its referral link (the trigger looked the profile up before it existed).
--  2. A referral code typed in lower case or with spaces did not link the new user to the referrer.
--  3. Orders from the newer products (Wish a Friend, UGC Ads) never paid referral commission.
--  4. The app could not read who it had referred (profiles are private), so counts and names were wrong.
--  5. The sign-up screen had no way to check a code before creating the account.

-- 1. Referral link -----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_generate_referral_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_url text;
BEGIN
  IF NEW.referral_code IS NOT NULL AND NEW.referral_url IS NULL THEN
    SELECT setting_value INTO base_url FROM public.platform_settings WHERE setting_key = 'platform_url';
    NEW.referral_url := coalesce(base_url, 'https://wishme.today') || '/auth?ref=' || NEW.referral_code;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET referral_url = coalesce((SELECT setting_value FROM public.platform_settings WHERE setting_key = 'platform_url'), 'https://wishme.today')
                   || '/auth?ref=' || referral_code
WHERE referral_url IS NULL AND referral_code IS NOT NULL;

-- 2. Case-insensitive referral codes ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_referral_from_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_metadata jsonb;
  ref_by uuid;
  ref_code text;
BEGIN
  IF NEW.referred_by IS NULL THEN
    SELECT raw_user_meta_data INTO auth_metadata FROM auth.users WHERE id = NEW.user_id;

    IF auth_metadata IS NOT NULL THEN
      IF auth_metadata->>'referred_by' IS NOT NULL THEN
        BEGIN
          ref_by := (auth_metadata->>'referred_by')::uuid;
          IF EXISTS (SELECT 1 FROM public.profiles WHERE id = ref_by) THEN
            NEW.referred_by := ref_by;
            RETURN NEW;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;

      ref_code := upper(btrim(coalesce(auth_metadata->>'referral_code', '')));
      IF ref_code <> '' THEN
        SELECT id INTO ref_by FROM public.profiles WHERE upper(referral_code) = ref_code LIMIT 1;
        IF ref_by IS NOT NULL THEN
          NEW.referred_by := ref_by;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Check a code before sign-up ----------------------------------------------------------------------
-- Returns the referrer's first name when the code exists, otherwise null. Anyone may call it (sign-up
-- happens before login); it reveals only a first name and only for a code that is already known.
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(nullif(btrim(first_name), ''), 'a WishMe member')
  FROM public.profiles
  WHERE upper(referral_code) = upper(btrim(coalesce(p_code, ''))) AND btrim(coalesce(p_code, '')) <> ''
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(text) TO anon, authenticated;

-- 4. Referral history for the app ---------------------------------------------------------------------
-- Profiles are private, so the app cannot look up the people it referred. This returns each commission with
-- the referred person's name (first name and last initial).
CREATE OR REPLACE FUNCTION public.get_my_referral_history()
RETURNS TABLE (
  id uuid,
  commission_level integer,
  commission_amount integer,
  status text,
  order_type text,
  created_at timestamptz,
  referred_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.id, t.commission_level, t.commission_amount, coalesce(t.status, 'pending'), t.order_type, t.created_at,
         coalesce(
           nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(nullif(left(p.last_name, 1), '') || '.', '')), ''),
           'A WishMe member'
         )
  FROM public.referral_transactions t
  LEFT JOIN public.profiles p ON p.id = t.referred_id
  WHERE t.referrer_id = public.get_my_profile_id()
  ORDER BY t.created_at DESC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_my_referral_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_referral_history() TO authenticated;

-- 5. Commission for Wish a Friend and UGC Ad orders -------------------------------------------------------
-- Same rules as the other products: paid when the order is completed (delivered), once per order, using the
-- referrer's plan rates. Level 1 is the person who referred the buyer, level 2 is who referred that person.
CREATE OR REPLACE FUNCTION public.award_referral_commission(
  p_buyer_profile uuid, p_order_id uuid, p_amount numeric, p_order_type text, p_label text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l1 uuid; l2 uuid;
  plan_name text;
  r1 numeric; r2 numeric;
  c1 integer; c2 integer;
BEGIN
  IF coalesce(p_amount, 0) <= 0 THEN RETURN; END IF;

  SELECT referred_by INTO l1 FROM public.profiles WHERE id = p_buyer_profile;
  IF l1 IS NULL OR l1 = p_buyer_profile THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.referral_transactions WHERE booking_id = p_order_id AND commission_level = 1 AND order_type = p_order_type) THEN
    SELECT plan::text INTO plan_name FROM public.profiles WHERE id = l1;
    SELECT coalesce(referral_commission_l1, 5) INTO r1 FROM public.plans WHERE lower(name) = lower(coalesce(plan_name, 'basic')) LIMIT 1;
    c1 := floor(p_amount * coalesce(r1, 5) / 100);
    IF c1 > 0 THEN
      INSERT INTO public.referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (l1, p_buyer_profile, p_order_id, c1, 1, 'completed', p_order_type);
      INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (l1, c1, 'referral_commission', 'completed', 'L1 referral commission from ' || p_label);
    END IF;
  END IF;

  SELECT referred_by INTO l2 FROM public.profiles WHERE id = l1;
  IF l2 IS NOT NULL AND l2 <> p_buyer_profile AND l2 <> l1
     AND NOT EXISTS (SELECT 1 FROM public.referral_transactions WHERE booking_id = p_order_id AND commission_level = 2 AND order_type = p_order_type) THEN
    SELECT plan::text INTO plan_name FROM public.profiles WHERE id = l2;
    SELECT coalesce(referral_commission_l2, 2) INTO r2 FROM public.plans WHERE lower(name) = lower(coalesce(plan_name, 'basic')) LIMIT 1;
    c2 := floor(p_amount * coalesce(r2, 2) / 100);
    IF c2 > 0 THEN
      INSERT INTO public.referral_transactions (referrer_id, referred_id, booking_id, commission_amount, commission_level, status, order_type)
      VALUES (l2, p_buyer_profile, p_order_id, c2, 2, 'completed', p_order_type);
      INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (l2, c2, 'referral_commission', 'completed', 'L2 referral commission from ' || p_label);
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.award_referral_commission(uuid, uuid, numeric, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_wish_friend_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.award_referral_commission(
      NEW.user_id, NEW.id, NEW.price_paid, 'wish_friend',
      CASE NEW.order_type WHEN 'ugc_video' THEN 'a UGC video order' ELSE 'a video wish order' END
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wish_friend_referral_commission ON public.wish_friend_orders;
CREATE TRIGGER trg_wish_friend_referral_commission
  AFTER INSERT OR UPDATE OF status ON public.wish_friend_orders
  FOR EACH ROW EXECUTE FUNCTION public.process_wish_friend_referral_commission();

-- ugc_ads.user_id is the sign-in id, not the profile id.
CREATE OR REPLACE FUNCTION public.process_ugc_ad_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  buyer uuid;
BEGIN
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT id INTO buyer FROM public.profiles WHERE user_id = NEW.user_id;
    IF buyer IS NOT NULL THEN
      PERFORM public.award_referral_commission(buyer, NEW.id, NEW.price_paid, 'ugc_ad', 'a UGC ad order');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ugc_ad_referral_commission ON public.ugc_ads;
CREATE TRIGGER trg_ugc_ad_referral_commission
  AFTER INSERT OR UPDATE OF status ON public.ugc_ads
  FOR EACH ROW EXECUTE FUNCTION public.process_ugc_ad_referral_commission();
