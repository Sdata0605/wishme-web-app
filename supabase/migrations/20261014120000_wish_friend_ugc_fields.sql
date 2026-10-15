-- UGC video orders need a few more production details than a plain video wish.
ALTER TABLE public.wish_friend_orders
  ADD COLUMN IF NOT EXISTS aspect_ratio text,
  ADD COLUMN IF NOT EXISTS hook_style text,
  ADD COLUMN IF NOT EXISTS call_to_action text,
  ADD COLUMN IF NOT EXISTS reference_image_url text;

DROP FUNCTION IF EXISTS public.create_wish_friend_order(text, uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_wish_friend_order(
  p_order_type text,
  p_celebrity_id uuid,
  p_recipient_name text,
  p_occasion text,
  p_relationship text,
  p_tone text,
  p_prompt text,
  p_aspect_ratio text DEFAULT NULL,
  p_hook_style text DEFAULT NULL,
  p_call_to_action text DEFAULT NULL,
  p_reference_image_url text DEFAULT NULL
)
RETURNS public.wish_friend_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_prices jsonb;
  v_base integer;
  v_discount_pct integer := 0;
  v_price integer;
  v_order public.wish_friend_orders;
BEGIN
  IF p_order_type NOT IN ('video_wish', 'ugc_video') THEN
    RAISE EXCEPTION 'Invalid order type';
  END IF;
  IF coalesce(btrim(p_recipient_name), '') = '' OR coalesce(btrim(p_occasion), '') = '' OR coalesce(btrim(p_prompt), '') = '' THEN
    RAISE EXCEPTION 'Name, occasion and prompt are required';
  END IF;

  -- Lock the buyer's profile row so two parallel orders cannot overspend the wallet.
  SELECT * INTO v_profile FROM public.profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT service_prices INTO v_prices FROM public.celebrities WHERE id = p_celebrity_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Celebrity not available';
  END IF;

  IF p_order_type = 'video_wish' THEN
    v_base := coalesce((v_prices->>'general_wish')::integer, 0);
  ELSE
    v_base := coalesce((v_prices->>'ugc_ad')::integer, 0);
    IF v_base <= 0 THEN
      SELECT coalesce(nullif(setting_value, '')::integer, 0) INTO v_base
      FROM public.platform_settings WHERE setting_key = 'ugc_video_price' LIMIT 1;
    END IF;
  END IF;
  IF coalesce(v_base, 0) <= 0 THEN
    RAISE EXCEPTION 'This service is not available for the selected celebrity';
  END IF;

  SELECT coalesce(service_discount_percentage, 0) INTO v_discount_pct
  FROM public.plans WHERE name = v_profile.plan::text LIMIT 1;
  v_discount_pct := coalesce(v_discount_pct, 0);
  v_price := round(v_base * (1 - v_discount_pct / 100.0));

  IF coalesce(v_profile.wallet_balance, 0) < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance: you need % but have %', v_price, coalesce(v_profile.wallet_balance, 0);
  END IF;

  INSERT INTO public.wish_friend_orders (
    user_id, order_type, celebrity_id, recipient_name, occasion, relationship, tone, prompt,
    aspect_ratio, hook_style, call_to_action, reference_image_url,
    original_price, discount_amount, price_paid
  ) VALUES (
    v_profile.id, p_order_type, p_celebrity_id, btrim(p_recipient_name), btrim(p_occasion),
    nullif(btrim(coalesce(p_relationship, '')), ''), nullif(btrim(coalesce(p_tone, '')), ''), btrim(p_prompt),
    nullif(btrim(coalesce(p_aspect_ratio, '')), ''), nullif(btrim(coalesce(p_hook_style, '')), ''),
    nullif(btrim(coalesce(p_call_to_action, '')), ''), nullif(btrim(coalesce(p_reference_image_url, '')), ''),
    v_base, v_base - v_price, v_price
  ) RETURNING * INTO v_order;

  -- The wallet trigger debits the balance for 'booking' transactions.
  INSERT INTO public.wallet_transactions (user_id, transaction_type, amount, status, payment_method, description, transaction_details)
  VALUES (
    v_profile.id, 'booking', v_price, 'completed', 'wallet',
    CASE p_order_type WHEN 'video_wish' THEN 'Wish a Friend: video wish' ELSE 'Wish a Friend: UGC video' END,
    jsonb_build_object('wish_friend_order_id', v_order.id, 'order_type', p_order_type, 'celebrity_id', p_celebrity_id)
  );

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_wish_friend_order(text, uuid, text, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_wish_friend_order(text, uuid, text, text, text, text, text, text, text, text, text) TO authenticated;
