-- ============================================
-- FINAL RLS FIX - Using only existing tables
-- ============================================

-- STEP 1: Create helper functions
CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Update is_admin_by_auth_uid to use user_roles (breaking the recursion)
CREATE OR REPLACE FUNCTION public.is_admin_by_auth_uid()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- STEP 2: Fix profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE USING (public.is_admin_by_auth_uid());

-- STEP 3: Fix plans policies
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;

CREATE POLICY "Anyone can view active plans" ON public.plans
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.plans
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 4: Fix celebrities policies
DROP POLICY IF EXISTS "Anyone can view verified celebrities" ON public.celebrities;
DROP POLICY IF EXISTS "Admins can manage all celebrities" ON public.celebrities;
DROP POLICY IF EXISTS "Celebrities can manage own profile" ON public.celebrities;

CREATE POLICY "Anyone can view verified celebrities" ON public.celebrities
FOR SELECT USING (is_verified = true OR public.is_admin_by_auth_uid());

CREATE POLICY "Admins can manage all celebrities" ON public.celebrities
FOR ALL USING (public.is_admin_by_auth_uid());

CREATE POLICY "Celebrities can manage own profile" ON public.celebrities
FOR ALL USING (profile_id = public.get_my_profile_id());

-- STEP 5: Fix wish_celebrity_orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.wish_celebrity_orders;

CREATE POLICY "Users can view own orders" ON public.wish_celebrity_orders
FOR SELECT USING (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

CREATE POLICY "Users can create orders" ON public.wish_celebrity_orders
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all orders" ON public.wish_celebrity_orders
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 6: Fix conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can manage all conversations" ON public.conversations;

CREATE POLICY "Users can view own conversations" ON public.conversations
FOR SELECT USING (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

CREATE POLICY "Users can create conversations" ON public.conversations
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all conversations" ON public.conversations
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 7: Fix messages policies
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;

CREATE POLICY "Users can view conversation messages" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
    AND (c.user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid())
  )
);

CREATE POLICY "Users can send messages" ON public.messages
FOR INSERT WITH CHECK (sender_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all messages" ON public.messages
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 8: Fix bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings" ON public.bookings
FOR SELECT USING (user_id = auth.uid() OR public.is_admin_by_auth_uid());

CREATE POLICY "Users can create bookings" ON public.bookings
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all bookings" ON public.bookings
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 9: Fix addresses policies
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.addresses;

CREATE POLICY "Users can manage own addresses" ON public.addresses
FOR ALL USING (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all addresses" ON public.addresses
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 10: Fix bank_details policies
DROP POLICY IF EXISTS "Users can manage own bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can manage all bank details" ON public.bank_details;

CREATE POLICY "Users can manage own bank details" ON public.bank_details
FOR ALL USING (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all bank details" ON public.bank_details
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 11: Fix wallet_transactions policies
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can manage all wallet transactions" ON public.wallet_transactions;

CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions
FOR SELECT USING (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

CREATE POLICY "Admins can manage all wallet transactions" ON public.wallet_transactions
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 12: Fix celebrity_favorites policies
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "Admins can manage all favorites" ON public.celebrity_favorites;

CREATE POLICY "Users can manage own favorites" ON public.celebrity_favorites
FOR ALL USING (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all favorites" ON public.celebrity_favorites
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 13: Fix referral_transactions policies
DROP POLICY IF EXISTS "Users can view own referral transactions" ON public.referral_transactions;
DROP POLICY IF EXISTS "Admins can manage all referral transactions" ON public.referral_transactions;

CREATE POLICY "Users can view own referral transactions" ON public.referral_transactions
FOR SELECT USING (referrer_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

CREATE POLICY "Admins can manage all referral transactions" ON public.referral_transactions
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 14: Fix music_generations policies
DROP POLICY IF EXISTS "Users can view own music" ON public.music_generations;
DROP POLICY IF EXISTS "Users can create music" ON public.music_generations;
DROP POLICY IF EXISTS "Admins can manage all music" ON public.music_generations;

CREATE POLICY "Users can view own music" ON public.music_generations
FOR SELECT USING (user_id = public.get_my_profile_id() OR public.is_admin_by_auth_uid());

CREATE POLICY "Users can create music" ON public.music_generations
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all music" ON public.music_generations
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 15: Fix media_library policies
DROP POLICY IF EXISTS "Everyone can view active media" ON public.media_library;
DROP POLICY IF EXISTS "Admin can manage all media" ON public.media_library;

CREATE POLICY "Everyone can view active media" ON public.media_library
FOR SELECT USING (is_active = true);

CREATE POLICY "Admin can manage all media" ON public.media_library
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 16: Fix occasions table policies
DROP POLICY IF EXISTS "Anyone can view occasions" ON public.occasions;
DROP POLICY IF EXISTS "Admins can manage occasions" ON public.occasions;

CREATE POLICY "Anyone can view occasions" ON public.occasions
FOR SELECT USING (true);

CREATE POLICY "Admins can manage occasions" ON public.occasions
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 17: Fix celebrity_categories policies
DROP POLICY IF EXISTS "Anyone can view categories" ON public.celebrity_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.celebrity_categories;

CREATE POLICY "Anyone can view categories" ON public.celebrity_categories
FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.celebrity_categories
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 18: Fix platform_settings policies
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;

CREATE POLICY "Anyone can view platform settings" ON public.platform_settings
FOR SELECT USING (true);

CREATE POLICY "Admins can manage platform settings" ON public.platform_settings
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 19: Fix loved_ones policies
DROP POLICY IF EXISTS "Users can manage own loved ones" ON public.loved_ones;
DROP POLICY IF EXISTS "Admins can manage all loved ones" ON public.loved_ones;

CREATE POLICY "Users can manage own loved ones" ON public.loved_ones
FOR ALL USING (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all loved ones" ON public.loved_ones
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 20: Fix occasion_alerts policies
DROP POLICY IF EXISTS "Users can manage own occasion alerts" ON public.occasion_alerts;
DROP POLICY IF EXISTS "Admins can manage all occasion alerts" ON public.occasion_alerts;

CREATE POLICY "Users can manage own occasion alerts" ON public.occasion_alerts
FOR ALL USING (user_id = public.get_my_profile_id());

CREATE POLICY "Admins can manage all occasion alerts" ON public.occasion_alerts
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 21: Fix delivery_type_pricing policies
DROP POLICY IF EXISTS "Anyone can view delivery pricing" ON public.delivery_type_pricing;
DROP POLICY IF EXISTS "Admins can manage delivery pricing" ON public.delivery_type_pricing;

CREATE POLICY "Anyone can view delivery pricing" ON public.delivery_type_pricing
FOR SELECT USING (true);

CREATE POLICY "Admins can manage delivery pricing" ON public.delivery_type_pricing
FOR ALL USING (public.is_admin_by_auth_uid());

-- STEP 22: Grant permissions on user_roles
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;