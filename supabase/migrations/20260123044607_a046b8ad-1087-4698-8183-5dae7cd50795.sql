-- ============================================
-- COMPREHENSIVE RLS FIX - REMOVE ALL RECURSIVE POLICIES
-- ============================================

-- PHASE 1: DROP ALL EXISTING POLICIES ON PROFILES TABLE
DROP POLICY IF EXISTS "Users can view referrer profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view celebrity profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

-- PHASE 2: DROP ALL EXISTING POLICIES ON CELEBRITIES TABLE
DROP POLICY IF EXISTS "Anyone can view active celebrities" ON public.celebrities;
DROP POLICY IF EXISTS "Admin can manage all celebrities" ON public.celebrities;
DROP POLICY IF EXISTS "Celebrity can update their own data" ON public.celebrities;
DROP POLICY IF EXISTS "Users can create their own celebrity profile" ON public.celebrities;
DROP POLICY IF EXISTS "celebrities_select_public" ON public.celebrities;
DROP POLICY IF EXISTS "celebrities_select_admin" ON public.celebrities;
DROP POLICY IF EXISTS "celebrities_insert_own" ON public.celebrities;
DROP POLICY IF EXISTS "celebrities_update_own" ON public.celebrities;
DROP POLICY IF EXISTS "celebrities_update_admin" ON public.celebrities;

-- PHASE 3: DROP ALL EXISTING POLICIES ON PLANS TABLE
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Admin can manage plans" ON public.plans;
DROP POLICY IF EXISTS "plans_select_public" ON public.plans;
DROP POLICY IF EXISTS "plans_insert_admin" ON public.plans;
DROP POLICY IF EXISTS "plans_update_admin" ON public.plans;
DROP POLICY IF EXISTS "plans_delete_admin" ON public.plans;

-- PHASE 4: DROP ALL EXISTING POLICIES ON WISH_CELEBRITY_ORDERS TABLE
DROP POLICY IF EXISTS "Admin can manage all wish orders" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Users can create their own celebrity wishes" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Users can update their own celebrity wishes" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Users can view their own celebrity wishes" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Celebrities can view wishes to them" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_celebrity_orders_select_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_celebrity_orders_select_admin" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_celebrity_orders_insert_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_celebrity_orders_update_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_celebrity_orders_update_admin" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_select_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_select_admin" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_insert_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_update_own" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "wish_orders_update_admin" ON public.wish_celebrity_orders;

-- PHASE 5: DROP ALL EXISTING POLICIES ON OTHER TABLES
-- Bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_admin" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_own" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_admin" ON public.bookings;

-- Addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON public.addresses;
DROP POLICY IF EXISTS "addresses_select_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_select_admin" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_own" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_own" ON public.addresses;

-- Bank Details
DROP POLICY IF EXISTS "Users can view own bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Admins can view all bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Users can insert own bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Users can update own bank details" ON public.bank_details;
DROP POLICY IF EXISTS "bank_details_select_own" ON public.bank_details;
DROP POLICY IF EXISTS "bank_details_select_admin" ON public.bank_details;
DROP POLICY IF EXISTS "bank_details_insert_own" ON public.bank_details;
DROP POLICY IF EXISTS "bank_details_update_own" ON public.bank_details;

-- Wallet Transactions
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can insert wallet transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_select_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_select_admin" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_transactions_insert_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_select_own" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_select_admin" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_insert_own" ON public.wallet_transactions;

-- Messages
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;

-- Conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;

-- Celebrity Reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "celebrity_reviews_select_public" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "celebrity_reviews_insert_own" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "celebrity_reviews_update_own" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "reviews_select_public" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.celebrity_reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.celebrity_reviews;

-- Celebrity Favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "Users can insert favorites" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "Users can delete favorites" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "celebrity_favorites_select_own" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "celebrity_favorites_insert_own" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "celebrity_favorites_delete_own" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "favorites_select_own" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.celebrity_favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON public.celebrity_favorites;

-- Referral Transactions
DROP POLICY IF EXISTS "Users can view own referral transactions" ON public.referral_transactions;
DROP POLICY IF EXISTS "Admins can view all referral transactions" ON public.referral_transactions;
DROP POLICY IF EXISTS "referral_transactions_select_own" ON public.referral_transactions;
DROP POLICY IF EXISTS "referral_transactions_select_admin" ON public.referral_transactions;
DROP POLICY IF EXISTS "referral_tx_select_own" ON public.referral_transactions;
DROP POLICY IF EXISTS "referral_tx_select_admin" ON public.referral_transactions;

-- Media Library
DROP POLICY IF EXISTS "Anyone can view active media" ON public.media_library;
DROP POLICY IF EXISTS "Admins can manage media" ON public.media_library;
DROP POLICY IF EXISTS "media_library_select_public" ON public.media_library;
DROP POLICY IF EXISTS "media_library_insert_admin" ON public.media_library;
DROP POLICY IF EXISTS "media_library_update_admin" ON public.media_library;
DROP POLICY IF EXISTS "media_library_delete_admin" ON public.media_library;
DROP POLICY IF EXISTS "media_select_public" ON public.media_library;
DROP POLICY IF EXISTS "media_select_admin" ON public.media_library;
DROP POLICY IF EXISTS "media_insert_admin" ON public.media_library;
DROP POLICY IF EXISTS "media_update_admin" ON public.media_library;
DROP POLICY IF EXISTS "media_delete_admin" ON public.media_library;

-- Music Generations
DROP POLICY IF EXISTS "Users can view own music" ON public.music_generations;
DROP POLICY IF EXISTS "Users can create music" ON public.music_generations;
DROP POLICY IF EXISTS "Users can update own music" ON public.music_generations;
DROP POLICY IF EXISTS "music_generations_select_own" ON public.music_generations;
DROP POLICY IF EXISTS "music_generations_insert_own" ON public.music_generations;
DROP POLICY IF EXISTS "music_generations_update_own" ON public.music_generations;
DROP POLICY IF EXISTS "music_select_own" ON public.music_generations;
DROP POLICY IF EXISTS "music_insert_own" ON public.music_generations;
DROP POLICY IF EXISTS "music_update_own" ON public.music_generations;

-- Loved Ones
DROP POLICY IF EXISTS "Users can view own loved ones" ON public.loved_ones;
DROP POLICY IF EXISTS "Users can insert loved ones" ON public.loved_ones;
DROP POLICY IF EXISTS "Users can update own loved ones" ON public.loved_ones;
DROP POLICY IF EXISTS "Users can delete own loved ones" ON public.loved_ones;
DROP POLICY IF EXISTS "loved_ones_select_own" ON public.loved_ones;
DROP POLICY IF EXISTS "loved_ones_insert_own" ON public.loved_ones;
DROP POLICY IF EXISTS "loved_ones_update_own" ON public.loved_ones;
DROP POLICY IF EXISTS "loved_ones_delete_own" ON public.loved_ones;

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_admin" ON public.user_roles;

-- PHASE 6: UPDATE HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin_by_auth_uid()
RETURNS BOOLEAN
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

CREATE OR REPLACE FUNCTION public.get_my_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- PHASE 7: CREATE CLEAN NON-RECURSIVE POLICIES

-- PROFILES TABLE
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles
FOR UPDATE USING (public.is_admin_by_auth_uid());

-- CELEBRITIES TABLE
CREATE POLICY "celebrities_select_public" ON public.celebrities
FOR SELECT USING (is_active = true);

CREATE POLICY "celebrities_select_admin" ON public.celebrities
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "celebrities_insert_own" ON public.celebrities
FOR INSERT WITH CHECK (profile_id = public.get_my_profile_id());

CREATE POLICY "celebrities_update_own" ON public.celebrities
FOR UPDATE USING (profile_id = public.get_my_profile_id());

CREATE POLICY "celebrities_update_admin" ON public.celebrities
FOR UPDATE USING (public.is_admin_by_auth_uid());

-- PLANS TABLE
CREATE POLICY "plans_select_public" ON public.plans
FOR SELECT USING (is_active = true);

CREATE POLICY "plans_select_admin" ON public.plans
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "plans_insert_admin" ON public.plans
FOR INSERT WITH CHECK (public.is_admin_by_auth_uid());

CREATE POLICY "plans_update_admin" ON public.plans
FOR UPDATE USING (public.is_admin_by_auth_uid());

CREATE POLICY "plans_delete_admin" ON public.plans
FOR DELETE USING (public.is_admin_by_auth_uid());

-- WISH_CELEBRITY_ORDERS TABLE
CREATE POLICY "wish_orders_select_own" ON public.wish_celebrity_orders
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "wish_orders_select_admin" ON public.wish_celebrity_orders
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "wish_orders_insert_own" ON public.wish_celebrity_orders
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "wish_orders_update_own" ON public.wish_celebrity_orders
FOR UPDATE USING (user_id = public.get_my_profile_id());

CREATE POLICY "wish_orders_update_admin" ON public.wish_celebrity_orders
FOR UPDATE USING (public.is_admin_by_auth_uid());

-- BOOKINGS TABLE
CREATE POLICY "bookings_select_own" ON public.bookings
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "bookings_select_admin" ON public.bookings
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "bookings_insert_own" ON public.bookings
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "bookings_update_own" ON public.bookings
FOR UPDATE USING (user_id = public.get_my_profile_id());

CREATE POLICY "bookings_update_admin" ON public.bookings
FOR UPDATE USING (public.is_admin_by_auth_uid());

-- ADDRESSES TABLE
CREATE POLICY "addresses_select_own" ON public.addresses
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "addresses_select_admin" ON public.addresses
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "addresses_insert_own" ON public.addresses
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "addresses_update_own" ON public.addresses
FOR UPDATE USING (user_id = public.get_my_profile_id());

CREATE POLICY "addresses_delete_own" ON public.addresses
FOR DELETE USING (user_id = public.get_my_profile_id());

-- BANK_DETAILS TABLE
CREATE POLICY "bank_details_select_own" ON public.bank_details
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "bank_details_select_admin" ON public.bank_details
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "bank_details_insert_own" ON public.bank_details
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "bank_details_update_own" ON public.bank_details
FOR UPDATE USING (user_id = public.get_my_profile_id());

-- WALLET_TRANSACTIONS TABLE
CREATE POLICY "wallet_tx_select_own" ON public.wallet_transactions
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "wallet_tx_select_admin" ON public.wallet_transactions
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "wallet_tx_insert_own" ON public.wallet_transactions
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

-- MESSAGES TABLE
CREATE POLICY "messages_select_participant" ON public.messages
FOR SELECT USING (sender_id = public.get_my_profile_id());

CREATE POLICY "messages_insert_own" ON public.messages
FOR INSERT WITH CHECK (sender_id = public.get_my_profile_id());

-- CONVERSATIONS TABLE
CREATE POLICY "conversations_select_participant" ON public.conversations
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "conversations_insert_own" ON public.conversations
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

-- CELEBRITY_REVIEWS TABLE
CREATE POLICY "reviews_select_public" ON public.celebrity_reviews
FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON public.celebrity_reviews
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "reviews_update_own" ON public.celebrity_reviews
FOR UPDATE USING (user_id = public.get_my_profile_id());

-- CELEBRITY_FAVORITES TABLE
CREATE POLICY "favorites_select_own" ON public.celebrity_favorites
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "favorites_insert_own" ON public.celebrity_favorites
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "favorites_delete_own" ON public.celebrity_favorites
FOR DELETE USING (user_id = public.get_my_profile_id());

-- REFERRAL_TRANSACTIONS TABLE
CREATE POLICY "referral_tx_select_own" ON public.referral_transactions
FOR SELECT USING (referrer_id = public.get_my_profile_id() OR referred_id = public.get_my_profile_id());

CREATE POLICY "referral_tx_select_admin" ON public.referral_transactions
FOR SELECT USING (public.is_admin_by_auth_uid());

-- MEDIA_LIBRARY TABLE
CREATE POLICY "media_select_public" ON public.media_library
FOR SELECT USING (is_active = true);

CREATE POLICY "media_select_admin" ON public.media_library
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "media_insert_admin" ON public.media_library
FOR INSERT WITH CHECK (public.is_admin_by_auth_uid());

CREATE POLICY "media_update_admin" ON public.media_library
FOR UPDATE USING (public.is_admin_by_auth_uid());

CREATE POLICY "media_delete_admin" ON public.media_library
FOR DELETE USING (public.is_admin_by_auth_uid());

-- MUSIC_GENERATIONS TABLE
CREATE POLICY "music_select_own" ON public.music_generations
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "music_insert_own" ON public.music_generations
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "music_update_own" ON public.music_generations
FOR UPDATE USING (user_id = public.get_my_profile_id());

-- LOVED_ONES TABLE
CREATE POLICY "loved_ones_select_own" ON public.loved_ones
FOR SELECT USING (user_id = public.get_my_profile_id());

CREATE POLICY "loved_ones_insert_own" ON public.loved_ones
FOR INSERT WITH CHECK (user_id = public.get_my_profile_id());

CREATE POLICY "loved_ones_update_own" ON public.loved_ones
FOR UPDATE USING (user_id = public.get_my_profile_id());

CREATE POLICY "loved_ones_delete_own" ON public.loved_ones
FOR DELETE USING (user_id = public.get_my_profile_id());

-- USER_ROLES TABLE
CREATE POLICY "user_roles_select_own" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_roles_select_admin" ON public.user_roles
FOR SELECT USING (public.is_admin_by_auth_uid());

CREATE POLICY "user_roles_insert_admin" ON public.user_roles
FOR INSERT WITH CHECK (public.is_admin_by_auth_uid());

CREATE POLICY "user_roles_update_admin" ON public.user_roles
FOR UPDATE USING (public.is_admin_by_auth_uid());

CREATE POLICY "user_roles_delete_admin" ON public.user_roles
FOR DELETE USING (public.is_admin_by_auth_uid());