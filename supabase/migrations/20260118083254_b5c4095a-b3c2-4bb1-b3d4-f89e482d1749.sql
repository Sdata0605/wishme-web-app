
-- Create function to process user referral commissions on bookings
CREATE OR REPLACE FUNCTION process_user_booking_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  user_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  l1_commission integer;
  l2_commission integer;
  referrer_plan text;
  user_email text;
  order_amount integer;
BEGIN
  -- Only process when booking status changes to 'confirmed' or 'completed'
  IF (NEW.status = 'confirmed' OR NEW.status = 'completed') 
     AND (OLD.status IS NULL OR (OLD.status != 'confirmed' AND OLD.status != 'completed')) THEN
    
    -- Get the order amount
    order_amount := COALESCE(NEW.final_price, NEW.original_price, 0);
    
    IF order_amount <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Get user's referrer (who referred this user)
    SELECT referred_by, email INTO user_referrer_id, user_email
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- If user was referred, process L1 commission
    IF user_referrer_id IS NOT NULL THEN
      -- Get L1 referrer's plan and commission rate
      SELECT plan::text INTO referrer_plan FROM profiles WHERE id = user_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct
      FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      
      l1_commission := (order_amount * COALESCE(l1_commission_pct, 5) / 100);
      
      IF l1_commission > 0 THEN
        -- Record L1 commission transaction
        INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_level, commission_amount, status)
        VALUES (user_referrer_id, NEW.user_id, NEW.id, 1, l1_commission, 'completed');
        
        -- Credit referrer's wallet
        UPDATE profiles 
        SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission 
        WHERE id = user_referrer_id;
        
        -- Record wallet transaction
        INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (user_referrer_id, l1_commission, 'referral_commission', 'completed', 
                'L1 referral commission from ' || COALESCE(user_email, 'user') || ' order (' || NEW.service_type::text || ')');
        
        -- Check for L2 referrer (referrer's referrer)
        SELECT referred_by INTO l2_referrer_id FROM profiles WHERE id = user_referrer_id;
        
        IF l2_referrer_id IS NOT NULL THEN
          -- Get L2 referrer's plan and commission rate
          SELECT plan::text INTO referrer_plan FROM profiles WHERE id = l2_referrer_id;
          SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct
          FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
          
          l2_commission := (order_amount * COALESCE(l2_commission_pct, 2) / 100);
          
          IF l2_commission > 0 THEN
            -- Record L2 commission transaction
            INSERT INTO referral_transactions (referrer_id, referred_id, booking_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.user_id, NEW.id, 2, l2_commission, 'completed');
            
            -- Credit L2 referrer's wallet
            UPDATE profiles 
            SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission 
            WHERE id = l2_referrer_id;
            
            -- Record wallet transaction
            INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission, 'referral_commission', 'completed',
                    'L2 referral commission from ' || COALESCE(user_email, 'user') || ' order (' || NEW.service_type::text || ')');
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on bookings table
DROP TRIGGER IF EXISTS trigger_user_booking_referral_commission ON bookings;
CREATE TRIGGER trigger_user_booking_referral_commission
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION process_user_booking_referral_commission();

-- Also add trigger for INSERT with confirmed/completed status (rare but possible)
DROP TRIGGER IF EXISTS trigger_user_booking_referral_commission_insert ON bookings;
CREATE TRIGGER trigger_user_booking_referral_commission_insert
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' OR NEW.status = 'completed')
  EXECUTE FUNCTION process_user_booking_referral_commission();
