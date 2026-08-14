
-- 1. Drop the FK constraint that blocks non-booking referral inserts
ALTER TABLE public.referral_transactions
DROP CONSTRAINT IF EXISTS referral_transactions_booking_id_fkey;

-- 2. Create atomic purchase RPC for celebrity subscriptions
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
  v_referrer_commission := FLOOR(p_price * COALESCE(v_pricing.referrer_commission_percentage, 10) / 100);
  v_celebrity_commission := FLOOR(p_price * COALESCE(v_pricing.celebrity_commission_percentage, 5) / 100);

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

  -- Only NOW debit the wallet (after favorite succeeded)
  IF p_payment_method = 'wallet' THEN
    INSERT INTO wallet_transactions (
      user_id, transaction_type, amount, status, payment_method, description
    ) VALUES (
      v_user_profile_id, 'celebrity_subscription', p_price, 'completed', 'wallet',
      'Subscription to celebrity'
    );
  END IF;

  -- Credit celebrity earnings (TDS handled by calculate_celebrity_commission_with_tds trigger)
  INSERT INTO celebrity_wallet_transactions (
    celebrity_id, transaction_type, amount, description, status
  ) VALUES (
    p_celebrity_id, 'earning', v_celebrity_commission,
    'Subscription commission from user', 'completed'
  );

  -- Update celebrity balances
  UPDATE celebrities 
  SET total_earnings = COALESCE(total_earnings, 0) + v_celebrity_commission,
      available_balance = COALESCE(available_balance, 0) + v_celebrity_commission
  WHERE id = p_celebrity_id;

  RETURN jsonb_build_object(
    'success', true,
    'favorite_id', v_favorite_id,
    'amount_charged', p_price
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error means nothing committed (transaction rolls back)
  RAISE;
END;
$$;
