-- Fix security warnings by setting proper search paths for functions

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, referral_code, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    public.generate_referral_code(),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$function$;

-- Fix generate_referral_code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  RETURN 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix make_user_admin function
CREATE OR REPLACE FUNCTION public.make_user_admin(user_email text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.profiles 
  SET role = 'admin' 
  WHERE email = user_email;
END;
$function$;

-- Fix calculate_booking_commission function
CREATE OR REPLACE FUNCTION public.calculate_booking_commission()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  celebrity_commission_rate INTEGER;
BEGIN
  -- Get celebrity commission percentage
  SELECT commission_percentage INTO celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  -- Set default if not found
  IF celebrity_commission_rate IS NULL THEN
    celebrity_commission_rate := 70;
  END IF;
  
  -- Calculate commissions
  NEW.commission_percentage := celebrity_commission_rate;
  NEW.celebrity_commission := (NEW.final_price * celebrity_commission_rate / 100);
  NEW.platform_fee := NEW.final_price - NEW.celebrity_commission;
  
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
      NEW.celebrity_commission,
      celebrity_commission_rate,
      NEW.platform_fee,
      'Commission from booking #' || NEW.id,
      'completed'
    );
    
    -- Update celebrity earnings
    UPDATE celebrities 
    SET 
      total_earnings = total_earnings + NEW.celebrity_commission,
      available_balance = available_balance + NEW.celebrity_commission
    WHERE id = NEW.celebrity_id;
  END IF;
  
  RETURN NEW;
END;
$$;