-- Pay the celebrity their cut on Wish a Friend and UGC orders, once the admin has completed the order.
--
-- These orders are made by the admin team: the user pays and picks a celebrity, the order lands in the
-- admin dashboard, the admin uploads the finished video and marks it completed. Until now nothing ever
-- credited the celebrity for them. The cut is the celebrity's commission % (set by the admin) minus TDS,
-- paid through credit_celebrity_for_order, which pays each order at most once.

CREATE OR REPLACE FUNCTION public.credit_celebrity_on_order_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_celebrity_id uuid;
  v_amount numeric;
  v_type text;
  v_label text;
BEGIN
  -- Only the transition into 'completed' pays.
  IF NEW.status IS DISTINCT FROM 'completed' OR OLD.status IS NOT DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  -- Only an admin (or a server function, which has no signed-in user) can complete an order for payout.
  -- The buyer can edit their own row, and must not be able to trigger or inflate a payout.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_by_auth_uid() THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'wish_friend_orders' THEN
    v_type := 'wish_friend_' || NEW.order_type;
    v_label := CASE NEW.order_type WHEN 'ugc_video' THEN 'UGC video' ELSE 'video wish' END;
  ELSE
    v_type := 'ugc_ad';
    v_label := 'UGC ad';
  END IF;

  v_celebrity_id := NEW.celebrity_id;
  v_amount := COALESCE(NEW.price_paid, 0);
  IF v_celebrity_id IS NULL OR v_amount <= 0 THEN
    RETURN NEW;
  END IF;

  PERFORM public.credit_celebrity_for_order(
    v_celebrity_id,
    NEW.id,
    v_type,
    v_amount,
    'Commission from ' || v_label || ' #' || LEFT(NEW.id::text, 8)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_credit_celebrity_wish_friend_completed ON public.wish_friend_orders;
CREATE TRIGGER trigger_credit_celebrity_wish_friend_completed
  AFTER UPDATE ON public.wish_friend_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_celebrity_on_order_completed();

DROP TRIGGER IF EXISTS trigger_credit_celebrity_ugc_ad_completed ON public.ugc_ads;
CREATE TRIGGER trigger_credit_celebrity_ugc_ad_completed
  AFTER UPDATE ON public.ugc_ads
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_celebrity_on_order_completed();

-- A celebrity can see the Wish a Friend and UGC orders made with them (their dashboard lists orders).
DROP POLICY IF EXISTS "Celebrities can view their wish friend orders" ON public.wish_friend_orders;
CREATE POLICY "Celebrities can view their wish friend orders"
  ON public.wish_friend_orders
  FOR SELECT
  USING (
    celebrity_id IN (
      SELECT c.id FROM celebrities c JOIN profiles p ON p.id = c.profile_id WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Celebrities can view their ugc ads" ON public.ugc_ads;
CREATE POLICY "Celebrities can view their ugc ads"
  ON public.ugc_ads
  FOR SELECT
  USING (
    celebrity_id IN (
      SELECT c.id FROM celebrities c JOIN profiles p ON p.id = c.profile_id WHERE p.user_id = auth.uid()
    )
  );
