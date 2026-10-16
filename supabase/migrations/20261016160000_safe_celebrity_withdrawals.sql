-- Celebrity withdrawals that cannot overdraw, double-spend or be forged.
--
-- Before this, a withdrawal was two separate client calls: insert a payout request, then (on the website only)
-- lower the balance from whatever the page had loaded. The app never lowered the balance at all, so the same
-- money could be requested again and again, and an admin rejection then added it back a second time. The
-- database accepted any amount, for any celebrity id, and a celebrity could even edit their own balance.

-- 1. The only way to request a payout: checks, request and balance move in one transaction.
CREATE OR REPLACE FUNCTION public.request_celebrity_payout(
  p_bank_name text,
  p_account_number text,
  p_ifsc_code text,
  p_account_holder_name text,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid;
  v_celeb record;
  v_request uuid;
  v_balance numeric;
BEGIN
  SELECT id INTO v_profile FROM profiles WHERE user_id = auth.uid();
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  -- Lock the celebrity row so two simultaneous requests cannot both spend the same balance.
  SELECT id, available_balance INTO v_celeb FROM celebrities WHERE profile_id = v_profile FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only celebrities can withdraw';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Enter an amount greater than zero';
  END IF;
  v_balance := COALESCE(v_celeb.available_balance, 0);
  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'You can withdraw up to ₹% right now', FLOOR(v_balance);
  END IF;

  IF COALESCE(btrim(p_bank_name), '') = '' OR COALESCE(btrim(p_account_number), '') = ''
     OR COALESCE(btrim(p_ifsc_code), '') = '' OR COALESCE(btrim(p_account_holder_name), '') = '' THEN
    RAISE EXCEPTION 'Bank name, account number, IFSC and account holder name are required';
  END IF;

  INSERT INTO payout_requests (
    celebrity_id, profile_id, requested_amount,
    bank_name, bank_account_number, ifsc_code, account_holder_name, status
  ) VALUES (
    v_celeb.id, v_profile, p_amount,
    btrim(p_bank_name), btrim(p_account_number), upper(btrim(p_ifsc_code)), btrim(p_account_holder_name), 'pending'
  ) RETURNING id INTO v_request;

  UPDATE celebrities SET available_balance = v_balance - p_amount WHERE id = v_celeb.id;

  RETURN jsonb_build_object('request_id', v_request, 'available_balance', v_balance - p_amount);
END;
$$;

REVOKE ALL ON FUNCTION public.request_celebrity_payout(text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_celebrity_payout(text, text, text, text, integer) TO authenticated;

-- 2. No more direct inserts into payout_requests: they skipped every check above.
DROP POLICY IF EXISTS "Celebrities can create payout requests" ON public.payout_requests;

-- 3. A rejected request gives the money back exactly once, whoever or whatever rejects it.
CREATE OR REPLACE FUNCTION public.restore_balance_on_payout_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    UPDATE celebrities
    SET available_balance = COALESCE(available_balance, 0) + NEW.requested_amount
    WHERE id = NEW.celebrity_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_restore_balance_on_payout_rejected ON public.payout_requests;
CREATE TRIGGER trigger_restore_balance_on_payout_rejected
  AFTER UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_balance_on_payout_rejected();

-- 4. A celebrity can edit their own profile, but not their money or their cut.
--    Direct API updates run as the 'authenticated' role; the server's own functions and edge functions do not,
--    and admins are exempt, so credits, payouts and the admin screens keep working.
CREATE OR REPLACE FUNCTION public.guard_celebrity_money_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND NOT public.is_admin_by_auth_uid() THEN
    NEW.total_earnings := OLD.total_earnings;
    NEW.available_balance := OLD.available_balance;
    NEW.commission_percentage := OLD.commission_percentage;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_celebrity_money_columns ON public.celebrities;
CREATE TRIGGER trigger_guard_celebrity_money_columns
  BEFORE UPDATE ON public.celebrities
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_celebrity_money_columns();
