-- Fix the existing user's referred_by relationship
UPDATE profiles 
SET referred_by = '7d208134-22dc-4cb8-8388-9278ae6b6532'
WHERE email = '32333@gmail.com';

-- Also update the sync_referral_from_metadata function to also check for referral_code in metadata
CREATE OR REPLACE FUNCTION public.sync_referral_from_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  auth_metadata jsonb;
  ref_by uuid;
  ref_code text;
BEGIN
  -- Only process if referred_by is not already set
  IF NEW.referred_by IS NULL THEN
    -- Get user metadata from auth.users
    SELECT raw_user_meta_data INTO auth_metadata
    FROM auth.users
    WHERE id = NEW.user_id;
    
    IF auth_metadata IS NOT NULL THEN
      -- First try to get referred_by directly
      IF auth_metadata->>'referred_by' IS NOT NULL THEN
        BEGIN
          ref_by := (auth_metadata->>'referred_by')::uuid;
          
          -- Verify the referrer exists
          IF EXISTS (SELECT 1 FROM profiles WHERE id = ref_by) THEN
            NEW.referred_by := ref_by;
            RETURN NEW;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Invalid UUID, continue to try referral_code
          NULL;
        END;
      END IF;
      
      -- If referred_by not found, try to lookup by referral_code
      ref_code := auth_metadata->>'referral_code';
      IF ref_code IS NOT NULL AND ref_code != '' THEN
        SELECT id INTO ref_by 
        FROM profiles 
        WHERE referral_code = ref_code
        LIMIT 1;
        
        IF ref_by IS NOT NULL THEN
          NEW.referred_by := ref_by;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;