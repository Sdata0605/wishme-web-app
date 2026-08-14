-- Fix: Update the calculate_booking_commission function to credit celebrities when status = 'confirmed'
-- This is because admin confirms orders (confirmed) which means payment is received and celebrity should earn

CREATE OR REPLACE FUNCTION public.calculate_booking_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  celebrity_commission_rate INTEGER;
  tds_rate INTEGER;
  celebrity_pan_verified BOOLEAN;
  gross_commission NUMERIC;
  tds_amount NUMERIC;
  net_commission NUMERIC;
  existing_transaction_count INTEGER;
  service_name TEXT;
BEGIN
  -- Get celebrity commission percentage
  SELECT commission_percentage INTO celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  -- Set default if not found
  IF celebrity_commission_rate IS NULL THEN
    celebrity_commission_rate := 70;
  END IF;
  
  -- Calculate gross commission
  gross_commission := (NEW.final_price * celebrity_commission_rate / 100);
  
  -- Get celebrity's PAN verification status
  SELECT p.pan_verified INTO celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.celebrity_id;
  
  -- Get appropriate TDS rate based on PAN verification
  IF celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO tds_rate
    FROM platform_settings
    WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO tds_rate
    FROM platform_settings
    WHERE setting_key = 'tds_rate_without_pan';
  END IF;
  
  -- Set default TDS rate if not found
  IF tds_rate IS NULL THEN
    tds_rate := CASE WHEN celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;
  
  -- Calculate TDS amount
  tds_amount := (gross_commission * tds_rate / 100);
  
  -- Calculate net commission after TDS
  net_commission := gross_commission - tds_amount;
  
  -- Set commission details
  NEW.commission_percentage := celebrity_commission_rate;
  NEW.celebrity_commission := net_commission;
  NEW.platform_fee := NEW.final_price - net_commission;
  
  -- Get service name as text
  service_name := NEW.service_type::text;
  
  -- Create wallet transaction when booking is CONFIRMED or COMPLETED (payment received)
  -- Check if status changed to confirmed or completed
  IF (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'pending')) 
     OR (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
    
    -- Check if wallet transaction already exists for this booking
    SELECT COUNT(*) INTO existing_transaction_count
    FROM celebrity_wallet_transactions
    WHERE booking_id = NEW.id;
    
    -- Only create transaction if none exists
    IF existing_transaction_count = 0 THEN
      INSERT INTO celebrity_wallet_transactions (
        celebrity_id,
        booking_id,
        transaction_type,
        amount,
        gross_amount,
        tds_percentage,
        tds_amount,
        commission_percentage,
        platform_fee,
        description,
        status
      ) VALUES (
        NEW.celebrity_id,
        NEW.id,
        'earning',
        net_commission,
        gross_commission,
        tds_rate,
        tds_amount,
        celebrity_commission_rate,
        NEW.platform_fee,
        'Commission from ' || COALESCE(service_name, 'order') || ' #' || LEFT(NEW.id::text, 8),
        'completed'
      );
      
      -- Update celebrity earnings
      UPDATE celebrities 
      SET 
        total_earnings = COALESCE(total_earnings, 0) + net_commission,
        available_balance = COALESCE(available_balance, 0) + net_commission
      WHERE id = NEW.celebrity_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Now backfill: Create wallet transactions for all existing confirmed bookings that don't have transactions
INSERT INTO celebrity_wallet_transactions (
  celebrity_id,
  booking_id,
  transaction_type,
  amount,
  gross_amount,
  tds_percentage,
  tds_amount,
  commission_percentage,
  platform_fee,
  description,
  status
)
SELECT 
  b.celebrity_id,
  b.id,
  'earning',
  b.celebrity_commission,
  (b.final_price * COALESCE(c.commission_percentage, 70) / 100),
  20,
  (b.final_price * COALESCE(c.commission_percentage, 70) / 100) * 0.2,
  COALESCE(c.commission_percentage, 70),
  b.platform_fee,
  'Commission from ' || b.service_type::text || ' #' || LEFT(b.id::text, 8),
  'completed'
FROM bookings b
JOIN celebrities c ON b.celebrity_id = c.id
WHERE b.status = 'confirmed'
  AND b.celebrity_id IS NOT NULL
  AND b.final_price > 0
  AND NOT EXISTS (
    SELECT 1 FROM celebrity_wallet_transactions cwt 
    WHERE cwt.booking_id = b.id
  );

-- Update celebrity total earnings for backfilled transactions
UPDATE celebrities c
SET 
  total_earnings = COALESCE(c.total_earnings, 0) + COALESCE(sub.total_earned, 0),
  available_balance = COALESCE(c.available_balance, 0) + COALESCE(sub.total_earned, 0)
FROM (
  SELECT 
    celebrity_id,
    SUM(amount) as total_earned
  FROM celebrity_wallet_transactions cwt
  WHERE cwt.created_at > NOW() - INTERVAL '1 minute'
  GROUP BY celebrity_id
) sub
WHERE c.id = sub.celebrity_id;