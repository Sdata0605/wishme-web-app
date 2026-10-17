-- Referral commission on plan purchases.
--
-- Before: it only paid when someone moved off basic, so a premium -> elite upgrade (₹999, charged in
-- full by both apps) paid the referrer nothing. It also nested level 2 inside level 1 and wrote no
-- order_type, so the commission showed up in the referral history with no label.
--
-- Now: every upgrade to a dearer plan pays, each level is paid on its own, each level's rate comes from
-- that person's own plan, and the same upgrade can never pay twice.

CREATE OR REPLACE FUNCTION public.process_plan_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_price integer;
  v_new_price integer;
  v_order_type text;
  v_l1 uuid;
  v_l2 uuid;
  v_plan text;
  v_pct integer;
  v_amount integer;
BEGIN
  -- "UPDATE OF plan" also fires when the plan is set to what it already was.
  IF NEW.plan IS NULL OR NEW.plan::text = COALESCE(OLD.plan::text, '') THEN
    RETURN NEW;
  END IF;

  SELECT price INTO v_new_price FROM plans WHERE lower(name) = lower(NEW.plan::text) LIMIT 1;
  SELECT price INTO v_old_price FROM plans WHERE lower(name) = lower(COALESCE(OLD.plan::text, '')) LIMIT 1;

  -- Only an upgrade pays. A downgrade, or a plan we do not sell, pays nothing.
  IF COALESCE(v_new_price, 0) <= 0 OR COALESCE(v_new_price, 0) <= COALESCE(v_old_price, 0) THEN
    RETURN NEW;
  END IF;

  -- Both apps charge the new plan's full price on an upgrade, so that is what the commission is on.
  -- The plan is part of the order type, so a later upgrade to a dearer plan pays again but the same one never does.
  v_order_type := 'plan_' || lower(NEW.plan::text);

  v_l1 := NEW.referred_by;
  IF v_l1 IS NULL OR v_l1 = NEW.id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM referral_transactions
    WHERE referred_id = NEW.id AND order_type = v_order_type AND commission_level = 1
  ) THEN
    SELECT plan::text INTO v_plan FROM profiles WHERE id = v_l1;
    SELECT COALESCE(referral_commission_l1, 5) INTO v_pct
    FROM plans WHERE lower(name) = lower(COALESCE(v_plan, 'basic')) LIMIT 1;

    v_amount := floor(v_new_price * COALESCE(v_pct, 5) / 100.0)::integer;
    IF v_amount > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l1, NEW.id, v_amount, 1, 'completed', v_order_type);

      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l1, v_amount, 'referral_commission', 'completed',
              'L1 referral commission from a ' || lower(NEW.plan::text) || ' plan purchase');
    END IF;
  END IF;

  SELECT referred_by INTO v_l2 FROM profiles WHERE id = v_l1;
  IF v_l2 IS NOT NULL AND v_l2 <> NEW.id AND v_l2 <> v_l1
     AND NOT EXISTS (
       SELECT 1 FROM referral_transactions
       WHERE referred_id = NEW.id AND order_type = v_order_type AND commission_level = 2
     ) THEN
    SELECT plan::text INTO v_plan FROM profiles WHERE id = v_l2;
    SELECT COALESCE(referral_commission_l2, 0) INTO v_pct
    FROM plans WHERE lower(name) = lower(COALESCE(v_plan, 'basic')) LIMIT 1;

    v_amount := floor(v_new_price * COALESCE(v_pct, 0) / 100.0)::integer;
    IF v_amount > 0 THEN
      INSERT INTO referral_transactions (referrer_id, referred_id, commission_amount, commission_level, status, order_type)
      VALUES (v_l2, NEW.id, v_amount, 2, 'completed', v_order_type);

      INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
      VALUES (v_l2, v_amount, 'referral_commission', 'completed',
              'L2 referral commission from a ' || lower(NEW.plan::text) || ' plan purchase');
    END IF;
  END IF;

  RETURN NEW;
END
$function$;
