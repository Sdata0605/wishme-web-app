-- Image promotions: pay the celebrity their commission and let them see the orders.
--
-- Before this, an image promotion charged the user and the celebrity earned nothing: no code credited them,
-- and the celebrity could not even read the order (RLS only allowed the buyer and admins).

-- 1. One place that credits a celebrity for a paid order: commission %, TDS, ledger row and balances.
--    Idempotent per (order, order type), so a retry can never pay the celebrity twice.
CREATE OR REPLACE FUNCTION public.credit_celebrity_for_order(
  p_celebrity_id uuid,
  p_order_id uuid,
  p_order_type text,
  p_amount numeric,
  p_description text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate integer;
  v_pan boolean;
  v_tds_rate integer;
  v_gross numeric;
  v_tds numeric;
  v_net numeric;
BEGIN
  IF p_celebrity_id IS NULL OR p_order_id IS NULL OR COALESCE(p_amount, 0) <= 0 THEN
    RETURN 0;
  END IF;

  -- Serialise concurrent calls for the same order, then skip if it was already paid.
  PERFORM pg_advisory_xact_lock(hashtext(p_order_type || ':' || p_order_id::text));
  IF EXISTS (
    SELECT 1 FROM celebrity_wallet_transactions
    WHERE booking_id = p_order_id AND order_type = p_order_type
  ) THEN
    RETURN 0;
  END IF;

  -- The celebrity's cut is whatever the admin set on their profile (default 70%).
  SELECT commission_percentage INTO v_rate FROM celebrities WHERE id = p_celebrity_id;
  v_rate := COALESCE(v_rate, 70);
  v_gross := FLOOR(p_amount * v_rate / 100);

  SELECT p.pan_verified INTO v_pan
  FROM celebrities c JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = p_celebrity_id;

  SELECT setting_value::integer INTO v_tds_rate
  FROM platform_settings
  WHERE setting_key = CASE WHEN v_pan IS TRUE THEN 'tds_rate_with_pan' ELSE 'tds_rate_without_pan' END;
  v_tds_rate := COALESCE(v_tds_rate, CASE WHEN v_pan IS TRUE THEN 10 ELSE 20 END);

  v_tds := FLOOR(v_gross * v_tds_rate / 100);
  v_net := v_gross - v_tds;

  INSERT INTO celebrity_wallet_transactions (
    celebrity_id, booking_id, order_type, transaction_type,
    amount, gross_amount, tds_percentage, tds_amount,
    commission_percentage, platform_fee, description, status
  ) VALUES (
    p_celebrity_id, p_order_id, p_order_type, 'earning',
    v_net, v_gross, v_tds_rate, v_tds,
    v_rate, p_amount - v_gross, p_description, 'completed'
  );

  UPDATE celebrities
  SET total_earnings = COALESCE(total_earnings, 0) + v_net,
      available_balance = COALESCE(available_balance, 0) + v_net
  WHERE id = p_celebrity_id;

  RETURN v_net;
END;
$$;

-- This moves money, so only the server (edge functions using the service role) may call it.
REVOKE ALL ON FUNCTION public.credit_celebrity_for_order(uuid, uuid, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_celebrity_for_order(uuid, uuid, text, numeric, text) TO service_role;

-- 2. A celebrity can see the image promotions made with them (the dashboard already tries to list them).
DROP POLICY IF EXISTS "Celebrities can view their image promotions" ON public.image_promotions;
CREATE POLICY "Celebrities can view their image promotions"
  ON public.image_promotions
  FOR SELECT
  USING (
    celebrity_id IN (
      SELECT c.id
      FROM celebrities c
      JOIN profiles p ON p.id = c.profile_id
      WHERE p.user_id = auth.uid()
    )
  );
