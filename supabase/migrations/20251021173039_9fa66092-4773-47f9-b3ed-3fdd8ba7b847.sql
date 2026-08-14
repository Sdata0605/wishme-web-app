-- Create database function for subscription check
CREATE OR REPLACE FUNCTION public.is_subscribed_to_celebrity(
  _user_id uuid,
  _celebrity_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.celebrity_favorites
    WHERE user_id = _user_id
      AND celebrity_id = _celebrity_id
      AND status = 'active'
  )
$$;

-- Add RLS policy for celebrity_favorites using the function
CREATE POLICY "Users can check subscription status"
ON public.celebrity_favorites
FOR SELECT
USING (public.is_subscribed_to_celebrity(auth.uid()::uuid, celebrity_id));

-- Create index for faster subscription lookups
CREATE INDEX IF NOT EXISTS idx_celebrity_favorites_user_celebrity 
ON public.celebrity_favorites(user_id, celebrity_id, status);

-- Create index for pricing lookups
CREATE INDEX IF NOT EXISTS idx_celebrity_favorite_pricing_celebrity 
ON public.celebrity_favorite_pricing(celebrity_id, is_enabled);

-- Add comment to function
COMMENT ON FUNCTION public.is_subscribed_to_celebrity IS 'Check if a user has an active subscription to a celebrity';
