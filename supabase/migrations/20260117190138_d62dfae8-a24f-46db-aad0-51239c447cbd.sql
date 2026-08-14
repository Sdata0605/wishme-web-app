-- Fix the generate_referral_url function to use correct domain
CREATE OR REPLACE FUNCTION public.generate_referral_url(profile_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_code text;
  base_url text;
BEGIN
  SELECT referral_code INTO ref_code
  FROM profiles
  WHERE id = profile_id;
  
  -- Use the correct production domain
  base_url := 'https://wishmefinal.lovable.app/auth?ref=';
  
  RETURN base_url || ref_code;
END;
$$;

-- Update all existing referral URLs to use the correct domain
UPDATE profiles 
SET referral_url = 'https://wishmefinal.lovable.app/auth?ref=' || referral_code
WHERE referral_code IS NOT NULL;

-- Drop and recreate the trigger function to fix commission processing
CREATE OR REPLACE FUNCTION public.process_referral_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l1_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  booking_amount integer;
  l1_commission_amount integer;
  l2_commission_amount integer;
  referrer_plan text;
BEGIN
  -- Process when booking status changes to 'confirmed' OR 'completed'
  IF (NEW.status = 'completed' OR NEW.status = 'confirmed') 
     AND (OLD.status IS NULL OR (OLD.status != 'completed' AND OLD.status != 'confirmed')) THEN
    
    booking_amount := COALESCE(NEW.final_price, 0);
    
    -- Skip if no price
    IF booking_amount <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Check if user was referred by someone
    SELECT referred_by INTO l1_referrer_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    IF l1_referrer_id IS NOT NULL THEN
      -- Get L1 referrer's plan and commission percentage
      SELECT plan::text INTO referrer_plan
      FROM profiles
      WHERE id = l1_referrer_id;
      
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct
      FROM plans
      WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic'))
      LIMIT 1;
      
      l1_commission_pct := COALESCE(l1_commission_pct, 5);
      l1_commission_amount := (booking_amount * l1_commission_pct / 100);
      
      IF l1_commission_amount > 0 THEN
        -- Create L1 referral transaction
        INSERT INTO referral_transactions (
          referrer_id, referred_id, booking_id,
          commission_level, commission_amount, status
        ) VALUES (
          l1_referrer_id, NEW.user_id, NEW.id,
          1, l1_commission_amount, 'completed'
        );
        
        -- Credit L1 referrer's wallet balance
        UPDATE profiles 
        SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission_amount
        WHERE id = l1_referrer_id;
        
        -- Record wallet transaction for L1
        INSERT INTO wallet_transactions (
          user_id, amount, transaction_type, status, description
        ) VALUES (
          l1_referrer_id, l1_commission_amount, 'referral_commission', 
          'completed', 'Level 1 referral commission from booking #' || LEFT(NEW.id::text, 8)
        );
      END IF;
      
      -- Check for L2 referrer (the person who referred L1)
      SELECT referred_by INTO l2_referrer_id
      FROM profiles
      WHERE id = l1_referrer_id;
      
      IF l2_referrer_id IS NOT NULL THEN
        -- Get L2 referrer's plan and commission percentage
        SELECT plan::text INTO referrer_plan
        FROM profiles
        WHERE id = l2_referrer_id;
        
        SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct
        FROM plans
        WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic'))
        LIMIT 1;
        
        l2_commission_pct := COALESCE(l2_commission_pct, 2);
        
        IF l2_commission_pct > 0 THEN
          l2_commission_amount := (booking_amount * l2_commission_pct / 100);
          
          IF l2_commission_amount > 0 THEN
            -- Create L2 referral transaction
            INSERT INTO referral_transactions (
              referrer_id, referred_id, booking_id,
              commission_level, commission_amount, status
            ) VALUES (
              l2_referrer_id, NEW.user_id, NEW.id,
              2, l2_commission_amount, 'completed'
            );
            
            -- Credit L2 referrer's wallet balance
            UPDATE profiles 
            SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission_amount
            WHERE id = l2_referrer_id;
            
            -- Record wallet transaction for L2
            INSERT INTO wallet_transactions (
              user_id, amount, transaction_type, status, description
            ) VALUES (
              l2_referrer_id, l2_commission_amount, 'referral_commission', 
              'completed', 'Level 2 referral commission from booking #' || LEFT(NEW.id::text, 8)
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Make sure the trigger exists on bookings table
DROP TRIGGER IF EXISTS process_referral_commissions_trigger ON bookings;
CREATE TRIGGER process_referral_commissions_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_commissions();