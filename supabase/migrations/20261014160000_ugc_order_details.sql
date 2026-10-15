-- Detailed UGC orders: every extra option the customer fills in is stored in order_details (jsonb),
-- so the admin sees the full brief and new options never need a schema change.
ALTER TABLE public.wish_friend_orders ADD COLUMN IF NOT EXISTS order_details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.ugc_ads ADD COLUMN IF NOT EXISTS order_details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.wish_friend_orders
  DROP CONSTRAINT IF EXISTS wish_friend_orders_details_size;
ALTER TABLE public.wish_friend_orders
  ADD CONSTRAINT wish_friend_orders_details_size CHECK (pg_column_size(order_details) < 20000);

DROP FUNCTION IF EXISTS public.create_wish_friend_order(text, uuid, text, text, text, text, text, text, text, text, text);

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
  p_reference_image_url text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
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
  IF jsonb_typeof(coalesce(p_details, '{}'::jsonb)) <> 'object' OR pg_column_size(coalesce(p_details, '{}'::jsonb)) >= 20000 THEN
    RAISE EXCEPTION 'Order details are invalid or too large';
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
    aspect_ratio, hook_style, call_to_action, reference_image_url, order_details,
    original_price, discount_amount, price_paid
  ) VALUES (
    v_profile.id, p_order_type, p_celebrity_id, btrim(p_recipient_name), btrim(p_occasion),
    nullif(btrim(coalesce(p_relationship, '')), ''), nullif(btrim(coalesce(p_tone, '')), ''), btrim(p_prompt),
    nullif(btrim(coalesce(p_aspect_ratio, '')), ''), nullif(btrim(coalesce(p_hook_style, '')), ''),
    nullif(btrim(coalesce(p_call_to_action, '')), ''), nullif(btrim(coalesce(p_reference_image_url, '')), ''),
    coalesce(p_details, '{}'::jsonb),
    v_base, v_base - v_price, v_price
  ) RETURNING * INTO v_order;

  -- The wallet trigger debits the balance for 'booking' transactions.
  INSERT INTO public.wallet_transactions (user_id, transaction_type, amount, status, payment_method, description, transaction_details)
  VALUES (
    v_profile.id, 'booking', v_price, 'completed', 'wallet',
    CASE p_order_type WHEN 'video_wish' THEN 'Wish a Friend: video wish' ELSE 'UGC video' END,
    jsonb_build_object('wish_friend_order_id', v_order.id, 'order_type', p_order_type, 'celebrity_id', p_celebrity_id)
  );

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_wish_friend_order(text, uuid, text, text, text, text, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_wish_friend_order(text, uuid, text, text, text, text, text, text, text, text, text, jsonb) TO authenticated;

-- UGC Ads: create the order and charge the wallet in one transaction, priced on the server.
-- Price = celebrity ugc_ad price if a celebrity is chosen and has one, else platform setting ugc_ads_price, minus plan discount.
CREATE OR REPLACE FUNCTION public.create_ugc_ad_order(
  p_celebrity_id uuid,
  p_product_name text,
  p_product_description text,
  p_product_image_url text,
  p_prompt text,
  p_hook_style text,
  p_call_to_action text,
  p_aspect_ratio text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS public.ugc_ads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_celeb public.celebrities%ROWTYPE;
  v_base integer := 0;
  v_discount_pct integer := 0;
  v_price integer;
  v_order public.ugc_ads;
  v_ratio text := coalesce(nullif(btrim(coalesce(p_aspect_ratio, '')), ''), '9:16');
BEGIN
  IF coalesce(btrim(p_product_name), '') = '' OR coalesce(btrim(p_product_image_url), '') = '' THEN
    RAISE EXCEPTION 'Product name and at least one product image are required';
  END IF;
  IF jsonb_typeof(coalesce(p_details, '{}'::jsonb)) <> 'object' OR pg_column_size(coalesce(p_details, '{}'::jsonb)) >= 20000 THEN
    RAISE EXCEPTION 'Order details are invalid or too large';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF p_celebrity_id IS NOT NULL THEN
    SELECT * INTO v_celeb FROM public.celebrities WHERE id = p_celebrity_id AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Celebrity not available';
    END IF;
    v_base := coalesce((v_celeb.service_prices->>'ugc_ad')::integer, 0);
  END IF;
  IF v_base <= 0 THEN
    SELECT coalesce(nullif(setting_value, '')::integer, 0) INTO v_base
    FROM public.platform_settings WHERE setting_key = 'ugc_ads_price' LIMIT 1;
  END IF;
  IF coalesce(v_base, 0) <= 0 THEN
    RAISE EXCEPTION 'UGC Ads are not available right now';
  END IF;

  SELECT coalesce(service_discount_percentage, 0) INTO v_discount_pct
  FROM public.plans WHERE name = v_profile.plan::text LIMIT 1;
  v_price := round(v_base * (1 - coalesce(v_discount_pct, 0) / 100.0));

  IF coalesce(v_profile.wallet_balance, 0) < v_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance: you need % but have %', v_price, coalesce(v_profile.wallet_balance, 0);
  END IF;

  INSERT INTO public.ugc_ads (
    user_id, product_name, product_description, product_image_url, prompt, hook_style, call_to_action,
    aspect_ratio, celebrity_id, status, price_paid, order_details, admin_notes
  ) VALUES (
    auth.uid(), btrim(p_product_name), nullif(btrim(coalesce(p_product_description, '')), ''), btrim(p_product_image_url),
    nullif(btrim(coalesce(p_prompt, '')), ''), nullif(btrim(coalesce(p_hook_style, '')), ''),
    nullif(btrim(coalesce(p_call_to_action, '')), ''), v_ratio, p_celebrity_id, 'pending_approval', v_price,
    coalesce(p_details, '{}'::jsonb),
    jsonb_pretty(jsonb_build_object(
      'product_name', btrim(p_product_name),
      'product_description', coalesce(p_product_description, ''),
      'product_image_url', btrim(p_product_image_url),
      'prompt', coalesce(p_prompt, ''),
      'hook_style', coalesce(nullif(p_hook_style, ''), 'question'),
      'call_to_action', coalesce(nullif(p_call_to_action, ''), 'Check the link!'),
      'aspect_ratio', v_ratio,
      'suggested_avatar_id', coalesce(v_celeb.heygen_avatar_id, 'Angela-inblackskirt-20220820'),
      'suggested_voice_id', coalesce(v_celeb.heygen_voice_id, '1bd001e7e50f421d891986aad5158bc8'),
      'celebrity_name', v_celeb.name
    ))
  ) RETURNING * INTO v_order;

  INSERT INTO public.wallet_transactions (user_id, transaction_type, amount, status, payment_method, description, transaction_details)
  VALUES (
    v_profile.id, 'ugc_video', v_price, 'completed', 'wallet', 'UGC Ad: ' || btrim(p_product_name),
    jsonb_build_object('ugc_ad_id', v_order.id, 'celebrity_id', p_celebrity_id)
  );

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ugc_ad_order(uuid, text, text, text, text, text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ugc_ad_order(uuid, text, text, text, text, text, text, text, jsonb) TO authenticated;
