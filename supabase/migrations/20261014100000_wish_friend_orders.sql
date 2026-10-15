-- Wish a Friend: video wish / UGC video requests that an admin fulfils by uploading a video.
-- Greeting cards keep using greeting_card_generations (AI, instant), so they are not part of this table.

CREATE TABLE IF NOT EXISTS public.wish_friend_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_type text NOT NULL CHECK (order_type IN ('video_wish', 'ugc_video')),
  celebrity_id uuid NOT NULL REFERENCES public.celebrities(id),
  recipient_name text NOT NULL,
  occasion text NOT NULL,
  relationship text,
  tone text,
  prompt text NOT NULL,
  original_price integer NOT NULL DEFAULT 0,
  discount_amount integer NOT NULL DEFAULT 0,
  price_paid integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  video_url text,
  video_file_key text,
  admin_notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wish_friend_orders_user ON public.wish_friend_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wish_friend_orders_status ON public.wish_friend_orders(status);

ALTER TABLE public.wish_friend_orders ENABLE ROW LEVEL SECURITY;

-- Users only read their own orders. They cannot insert directly: orders are created (and paid)
-- through create_wish_friend_order() so the price can never be chosen by the client.
CREATE POLICY "Users can view their own wish friend orders"
  ON public.wish_friend_orders FOR SELECT
  USING (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can view all wish friend orders"
  ON public.wish_friend_orders FOR SELECT
  USING (public.is_admin_by_auth_uid());

CREATE POLICY "Admins can update wish friend orders"
  ON public.wish_friend_orders FOR UPDATE
  USING (public.is_admin_by_auth_uid())
  WITH CHECK (public.is_admin_by_auth_uid());

CREATE TRIGGER update_wish_friend_orders_updated_at
  BEFORE UPDATE ON public.wish_friend_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Creates the order and debits the wallet in a single transaction.
-- Price = celebrity price for the service (UGC falls back to the platform setting) minus the plan discount.
CREATE OR REPLACE FUNCTION public.create_wish_friend_order(
  p_order_type text,
  p_celebrity_id uuid,
  p_recipient_name text,
  p_occasion text,
  p_relationship text,
  p_tone text,
  p_prompt text
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
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  INSERT INTO public.wish_friend_orders (
    user_id, order_type, celebrity_id, recipient_name, occasion, relationship, tone, prompt,
    original_price, discount_amount, price_paid
  ) VALUES (
    v_profile.id, p_order_type, p_celebrity_id, btrim(p_recipient_name), btrim(p_occasion),
    nullif(btrim(coalesce(p_relationship, '')), ''), nullif(btrim(coalesce(p_tone, '')), ''), btrim(p_prompt),
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

REVOKE ALL ON FUNCTION public.create_wish_friend_order(text, uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_wish_friend_order(text, uuid, text, text, text, text, text) TO authenticated;
