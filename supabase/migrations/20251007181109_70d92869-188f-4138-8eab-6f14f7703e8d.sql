-- Create referral commission tracking system with 2-level support

-- Create trigger to process referral commissions when bookings are completed
CREATE OR REPLACE FUNCTION process_referral_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_user_id uuid;
  l1_referrer_id uuid;
  l2_referrer_id uuid;
  user_plan_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  booking_amount integer;
  l1_commission_amount integer;
  l2_commission_amount integer;
BEGIN
  -- Only process when booking status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get the user who made the booking
    SELECT user_id INTO booking_user_id FROM profiles WHERE id = NEW.user_id;
    
    -- Get the booking amount
    booking_amount := NEW.final_price;
    
    -- Check if user was referred by someone
    SELECT referred_by, plan INTO l1_referrer_id, user_plan_id
    FROM profiles
    WHERE id = NEW.user_id;
    
    IF l1_referrer_id IS NOT NULL THEN
      -- Get L1 commission percentage from referrer's plan
      SELECT referral_commission_l1 INTO l1_commission_pct
      FROM plans p
      JOIN profiles prof ON prof.plan::text = p.name
      WHERE prof.id = l1_referrer_id
      LIMIT 1;
      
      -- Default to 5% if no plan found
      l1_commission_pct := COALESCE(l1_commission_pct, 5);
      
      -- Calculate L1 commission
      l1_commission_amount := (booking_amount * l1_commission_pct / 100);
      
      -- Create L1 referral transaction
      INSERT INTO referral_transactions (
        referrer_id,
        referred_id,
        booking_id,
        commission_level,
        commission_amount,
        status
      ) VALUES (
        l1_referrer_id,
        NEW.user_id,
        NEW.id,
        1,
        l1_commission_amount,
        'completed'
      );
      
      -- Check for L2 referrer (referrer of referrer)
      SELECT referred_by INTO l2_referrer_id
      FROM profiles
      WHERE id = l1_referrer_id;
      
      IF l2_referrer_id IS NOT NULL THEN
        -- Get L2 commission percentage
        SELECT referral_commission_l2 INTO l2_commission_pct
        FROM plans p
        JOIN profiles prof ON prof.plan::text = p.name
        WHERE prof.id = l2_referrer_id
        LIMIT 1;
        
        -- Default to 2% if no plan found
        l2_commission_pct := COALESCE(l2_commission_pct, 2);
        
        -- Calculate L2 commission
        l2_commission_amount := (booking_amount * l2_commission_pct / 100);
        
        -- Create L2 referral transaction
        INSERT INTO referral_transactions (
          referrer_id,
          referred_id,
          booking_id,
          commission_level,
          commission_amount,
          status
        ) VALUES (
          l2_referrer_id,
          NEW.user_id,
          NEW.id,
          2,
          l2_commission_amount,
          'completed'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_referral_commissions ON bookings;
CREATE TRIGGER trigger_referral_commissions
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION process_referral_commissions();

-- Handle celebrity referral commissions
CREATE OR REPLACE FUNCTION process_celebrity_referral_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  celebrity_profile_id uuid;
  celebrity_referrer_id uuid;
  celebrity_commission_pct integer;
  celebrity_commission_amount integer;
BEGIN
  -- Only process when booking status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Get celebrity's profile_id
    SELECT profile_id INTO celebrity_profile_id
    FROM celebrities
    WHERE id = NEW.celebrity_id;
    
    -- Check if celebrity was referred
    SELECT referred_by INTO celebrity_referrer_id
    FROM profiles
    WHERE id = celebrity_profile_id;
    
    IF celebrity_referrer_id IS NOT NULL THEN
      -- Check if referrer is also a celebrity (get their commission %)
      SELECT c.commission_percentage INTO celebrity_commission_pct
      FROM celebrities c
      WHERE c.profile_id = celebrity_referrer_id;
      
      IF celebrity_commission_pct IS NOT NULL THEN
        -- Calculate 10% of the celebrity's earnings as referral commission
        celebrity_commission_amount := (NEW.celebrity_commission * 10 / 100);
        
        -- Create celebrity referral transaction
        INSERT INTO referral_transactions (
          referrer_id,
          referred_id,
          booking_id,
          commission_level,
          commission_amount,
          status
        ) VALUES (
          celebrity_referrer_id,
          celebrity_profile_id,
          NEW.id,
          1,
          celebrity_commission_amount,
          'completed'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for celebrity referrals
DROP TRIGGER IF EXISTS trigger_celebrity_referral_commissions ON bookings;
CREATE TRIGGER trigger_celebrity_referral_commissions
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION process_celebrity_referral_commissions();