-- Drop conflicting RLS policies on wallet_transactions
DROP POLICY IF EXISTS "Users can create their own debit transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can create their own deposit requests" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admin can manage all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage all wallet transactions" ON public.wallet_transactions;

-- Keep unified policies only (clean up duplicates)
DROP POLICY IF EXISTS "wallet_tx_insert_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_select_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_select_admin" ON public.wallet_transactions;

-- Create clean unified policies
CREATE POLICY "wallet_tx_select_own"
  ON public.wallet_transactions FOR SELECT
  USING (user_id = public.get_my_profile_id());

CREATE POLICY "wallet_tx_select_admin"
  ON public.wallet_transactions FOR SELECT
  USING (public.is_admin_by_auth_uid());

CREATE POLICY "wallet_tx_insert_own"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "wallet_tx_admin_all"
  ON public.wallet_transactions FOR ALL
  USING (public.is_admin_by_auth_uid());

-- Also fix wish_celebrity_orders if similar issue exists there
DROP POLICY IF EXISTS "Users can create wish celebrity orders" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Users can view their wish celebrity orders" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Admins can manage all wish celebrity orders" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_insert_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_select_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_admin_all" ON public.wish_celebrity_orders;

-- Create clean policies for wish_celebrity_orders
CREATE POLICY "wish_orders_select_own"
  ON public.wish_celebrity_orders FOR SELECT
  USING (user_id = public.get_my_profile_id());

CREATE POLICY "wish_orders_insert_own"
  ON public.wish_celebrity_orders FOR INSERT
  WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "wish_orders_admin_all"
  ON public.wish_celebrity_orders FOR ALL
  USING (public.is_admin_by_auth_uid());