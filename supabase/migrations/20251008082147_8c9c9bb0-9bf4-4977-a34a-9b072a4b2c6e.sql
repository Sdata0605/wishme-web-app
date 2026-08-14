-- Fix security warning: Recreate function with search_path
DROP FUNCTION IF EXISTS update_celebrity_favorite_pricing_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_celebrity_favorite_pricing_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER celebrity_favorite_pricing_updated_at
  BEFORE UPDATE ON public.celebrity_favorite_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_celebrity_favorite_pricing_updated_at();