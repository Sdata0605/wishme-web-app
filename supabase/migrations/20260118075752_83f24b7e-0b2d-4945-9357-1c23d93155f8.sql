-- =============================================
-- FIX 1: Sync referral from auth user metadata on profile creation
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_referral_from_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  auth_metadata jsonb;
  ref_by uuid;
BEGIN
  -- Only process if referred_by is not already set
  IF NEW.referred_by IS NULL THEN
    -- Get user metadata from auth.users
    SELECT raw_user_meta_data INTO auth_metadata
    FROM auth.users
    WHERE id = NEW.user_id;
    
    -- Extract referred_by if present
    IF auth_metadata IS NOT NULL AND auth_metadata->>'referred_by' IS NOT NULL THEN
      BEGIN
        ref_by := (auth_metadata->>'referred_by')::uuid;
        
        -- Verify the referrer exists
        IF EXISTS (SELECT 1 FROM profiles WHERE id = ref_by) THEN
          NEW.referred_by := ref_by;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Invalid UUID, skip
        NULL;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run on profile insert
DROP TRIGGER IF EXISTS trigger_sync_referral_metadata ON profiles;
CREATE TRIGGER trigger_sync_referral_metadata
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_referral_from_metadata();

-- =============================================
-- FIX 2: Process referral commission on plan upgrade
-- =============================================

CREATE OR REPLACE FUNCTION public.process_plan_referral_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  l1_referrer_id uuid;
  l2_referrer_id uuid;
  l1_commission_pct integer;
  l2_commission_pct integer;
  plan_amount integer;
  l1_commission integer;
  l2_commission integer;
  referrer_plan text;
BEGIN
  -- Only process when plan changes from 'basic' to 'premium' or 'elite'
  IF OLD.plan = 'basic' AND (NEW.plan = 'premium' OR NEW.plan = 'elite') THEN
    
    -- Get plan price
    SELECT price INTO plan_amount
    FROM plans
    WHERE LOWER(name) = LOWER(NEW.plan::text)
    LIMIT 1;
    
    IF plan_amount IS NULL OR plan_amount <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Check if user was referred
    IF NEW.referred_by IS NOT NULL THEN
      l1_referrer_id := NEW.referred_by;
      
      -- Get L1 referrer's plan and commission rate
      SELECT plan::text INTO referrer_plan FROM profiles WHERE id = l1_referrer_id;
      SELECT COALESCE(referral_commission_l1, 5) INTO l1_commission_pct
      FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
      
      l1_commission := (plan_amount * COALESCE(l1_commission_pct, 5) / 100);
      
      IF l1_commission > 0 THEN
        -- Record L1 commission transaction
        INSERT INTO referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
        VALUES (l1_referrer_id, NEW.id, 1, l1_commission, 'completed');
        
        -- Credit referrer's wallet
        UPDATE profiles 
        SET wallet_balance = COALESCE(wallet_balance, 0) + l1_commission 
        WHERE id = l1_referrer_id;
        
        -- Record wallet transaction
        INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
        VALUES (l1_referrer_id, l1_commission, 'referral_commission', 'completed', 
                'L1 referral commission from ' || NEW.email || ' plan upgrade to ' || NEW.plan::text);
        
        -- Check for L2 referrer (referrer's referrer)
        SELECT referred_by INTO l2_referrer_id FROM profiles WHERE id = l1_referrer_id;
        
        IF l2_referrer_id IS NOT NULL THEN
          -- Get L2 referrer's plan and commission rate
          SELECT plan::text INTO referrer_plan FROM profiles WHERE id = l2_referrer_id;
          SELECT COALESCE(referral_commission_l2, 2) INTO l2_commission_pct
          FROM plans WHERE LOWER(name) = LOWER(COALESCE(referrer_plan, 'basic')) LIMIT 1;
          
          l2_commission := (plan_amount * COALESCE(l2_commission_pct, 2) / 100);
          
          IF l2_commission > 0 THEN
            -- Record L2 commission transaction
            INSERT INTO referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
            VALUES (l2_referrer_id, NEW.id, 2, l2_commission, 'completed');
            
            -- Credit L2 referrer's wallet
            UPDATE profiles 
            SET wallet_balance = COALESCE(wallet_balance, 0) + l2_commission 
            WHERE id = l2_referrer_id;
            
            -- Record wallet transaction
            INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
            VALUES (l2_referrer_id, l2_commission, 'referral_commission', 'completed',
                    'L2 referral commission from ' || NEW.email || ' plan upgrade to ' || NEW.plan::text);
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for plan upgrade commissions
DROP TRIGGER IF EXISTS trigger_plan_referral_commission ON profiles;
CREATE TRIGGER trigger_plan_referral_commission
  AFTER UPDATE OF plan ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION process_plan_referral_commission();