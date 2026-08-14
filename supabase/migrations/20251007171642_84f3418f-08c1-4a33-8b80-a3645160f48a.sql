-- Update the commission calculation trigger to include TDS deduction
CREATE OR REPLACE FUNCTION public.calculate_booking_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  celebrity_commission_rate INTEGER;
  tds_rate INTEGER;
  celebrity_pan_verified BOOLEAN;
  gross_commission NUMERIC;
  tds_amount NUMERIC;
  net_commission NUMERIC;
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
  
  -- Create wallet transaction when booking is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO celebrity_wallet_transactions (
      celebrity_id,
      booking_id,
      transaction_type,
      amount,
      commission_percentage,
      platform_fee,
      description,
      status
    ) VALUES (
      NEW.celebrity_id,
      NEW.id,
      'earning',
      net_commission,
      celebrity_commission_rate,
      NEW.platform_fee,
      'Commission from booking #' || NEW.id || ' (TDS ' || tds_rate || '% deducted: ₹' || tds_amount || ')',
      'completed'
    );
    
    -- Update celebrity earnings
    UPDATE celebrities 
    SET 
      total_earnings = total_earnings + net_commission,
      available_balance = available_balance + net_commission
    WHERE id = NEW.celebrity_id;
  END IF;
  
  RETURN NEW;
END;
$$;