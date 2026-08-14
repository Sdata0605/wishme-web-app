-- Fix RLS policies on wish_celebrity_orders table
-- Drop existing policies
DROP POLICY IF EXISTS "Users can create their own celebrity wishes" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Users can update their own celebrity wishes" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Users can view their own celebrity wishes" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Celebrities can view wishes to them" ON public.wish_celebrity_orders;
DROP POLICY IF EXISTS "Admin can manage all wish orders" ON public.wish_celebrity_orders;

-- Recreate policies with correct auth.uid() to profiles.user_id mapping
-- Admin policy
CREATE POLICY "Admin can manage all wish orders"
ON public.wish_celebrity_orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.role = 'admin'::user_role
  )
);

-- Users can insert their own wish orders
CREATE POLICY "Users can create their own celebrity wishes"
ON public.wish_celebrity_orders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = wish_celebrity_orders.user_id
      AND p.user_id = auth.uid()
  )
);

-- Users can view their own wish orders
CREATE POLICY "Users can view their own celebrity wishes"
ON public.wish_celebrity_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = wish_celebrity_orders.user_id
      AND p.user_id = auth.uid()
  )
);

-- Users can update their own wish orders
CREATE POLICY "Users can update their own celebrity wishes"
ON public.wish_celebrity_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = wish_celebrity_orders.user_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = wish_celebrity_orders.user_id
      AND p.user_id = auth.uid()
  )
);

-- Celebrities can view wishes sent to them
CREATE POLICY "Celebrities can view wishes to them"
ON public.wish_celebrity_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.celebrities c
    JOIN public.profiles p ON p.id = c.profile_id
    WHERE c.id = wish_celebrity_orders.celebrity_id
      AND p.user_id = auth.uid()
  )
);