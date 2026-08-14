DO $$
DECLARE
  rec RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR rec IN 
    SELECT id FROM bookings 
    WHERE (video_status IN ('ready', 'completed') 
           OR status IN ('completed', 'video_sent'))
    AND recipient_verification_code IS NULL
  LOOP
    LOOP
      new_code := UPPER(SUBSTRING(
        MD5(RANDOM()::TEXT || rec.id::TEXT) 
        FROM 1 FOR 8
      ));
      SELECT EXISTS(
        SELECT 1 FROM bookings 
        WHERE recipient_verification_code = new_code
      ) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    UPDATE bookings 
    SET recipient_verification_code = new_code
    WHERE id = rec.id;
  END LOOP;
END $$;