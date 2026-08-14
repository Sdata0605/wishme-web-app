-- Add referral_4day_reminder_sent column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_4day_reminder_sent boolean DEFAULT false;

-- Add celebrity_reminder_sent column to bookings 
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS celebrity_reminder_sent boolean DEFAULT false;

-- ==========================================
-- CRON JOB FUNCTIONS
-- ==========================================

-- 1. Daily Occasion Reminders (8am)
CREATE OR REPLACE FUNCTION public.cron_occasion_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_alert RECORD;
  v_user_name TEXT;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  FOR v_alert IN
    SELECT oa.*, p.first_name, p.id as profile_id
    FROM occasion_alerts oa
    JOIN profiles p ON p.id = oa.user_id
    WHERE oa.notification_sent IS NOT TRUE
      AND (
        oa.alert_date = CURRENT_DATE + INTERVAL '7 days'
        OR oa.alert_date = CURRENT_DATE + INTERVAL '1 day'
      )
  LOOP
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','occasion_reminder','recipient_type','user','recipient_id',v_alert.profile_id,
        'data',jsonb_build_object('first_name',COALESCE(v_alert.first_name,'User'),'occasion_name',v_alert.occasion_name,'person_name',COALESCE(v_alert.person_name,''),'days',(v_alert.alert_date - CURRENT_DATE)::text)
      )::text,
      timeout_milliseconds := 5000
    );
  END LOOP;
END;
$$;

-- 2. Daily Subscription Expiry Check (9am)
CREATE OR REPLACE FUNCTION public.cron_subscription_expiry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_fav RECORD;
  v_user_name TEXT;
  v_celebrity_name TEXT;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  -- Expiring in 3 days
  FOR v_fav IN
    SELECT cf.*, p.first_name, p.id as profile_id, c.name as celeb_name
    FROM celebrity_favorites cf
    JOIN profiles p ON p.id = cf.user_id
    JOIN celebrities c ON c.id = cf.celebrity_id
    WHERE cf.status = 'active'
      AND cf.subscription_expires_at::date = CURRENT_DATE + 3
  LOOP
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','celebrity_subscription_expiring','recipient_type','user','recipient_id',v_fav.profile_id,
        'data',jsonb_build_object('first_name',COALESCE(v_fav.first_name,'User'),'celebrity_name',v_fav.celeb_name)
      )::text,
      timeout_milliseconds := 5000
    );
  END LOOP;

  -- Expired today or past
  FOR v_fav IN
    SELECT cf.*, p.first_name, p.id as profile_id, c.name as celeb_name
    FROM celebrity_favorites cf
    JOIN profiles p ON p.id = cf.user_id
    JOIN celebrities c ON c.id = cf.celebrity_id
    WHERE cf.status = 'active'
      AND cf.subscription_expires_at::date <= CURRENT_DATE
  LOOP
    UPDATE celebrity_favorites SET status = 'expired' WHERE id = v_fav.id;
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','celebrity_subscription_expired','recipient_type','user','recipient_id',v_fav.profile_id,
        'data',jsonb_build_object('first_name',COALESCE(v_fav.first_name,'User'),'celebrity_name',v_fav.celeb_name)
      )::text,
      timeout_milliseconds := 5000
    );
  END LOOP;
END;
$$;

-- 3. Daily Plan Expiry Check (9am)
CREATE OR REPLACE FUNCTION public.cron_plan_expiry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_profile RECORD;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  -- Expiring in 5 days
  FOR v_profile IN
    SELECT id, first_name, plan FROM profiles
    WHERE plan IS NOT NULL AND plan != 'basic'
      AND plan_expires_at::date = CURRENT_DATE + 5
  LOOP
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','plan_expiring','recipient_type','user','recipient_id',v_profile.id,
        'data',jsonb_build_object('first_name',COALESCE(v_profile.first_name,'User'),'plan_name',v_profile.plan::text)
      )::text,
      timeout_milliseconds := 5000
    );
  END LOOP;

  -- Expired today or past
  FOR v_profile IN
    SELECT id, first_name, plan FROM profiles
    WHERE plan IS NOT NULL AND plan != 'basic'
      AND plan_expires_at::date <= CURRENT_DATE
  LOOP
    UPDATE profiles SET plan = 'basic' WHERE id = v_profile.id;
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','plan_expired','recipient_type','user','recipient_id',v_profile.id,
        'data',jsonb_build_object('first_name',COALESCE(v_profile.first_name,'User'),'plan_name',v_profile.plan::text)
      )::text,
      timeout_milliseconds := 5000
    );
  END LOOP;
END;
$$;

-- 4. 4-Day Referral Reminder (10am)
CREATE OR REPLACE FUNCTION public.cron_referral_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_user RECORD;
  v_referrer RECORD;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  FOR v_user IN
    SELECT p.id, p.first_name, p.referred_by
    FROM profiles p
    WHERE p.referred_by IS NOT NULL
      AND p.created_at::date = CURRENT_DATE - 4
      AND COALESCE(p.wallet_balance, 0) = 0
      AND p.referral_4day_reminder_sent IS NOT TRUE
      AND NOT EXISTS (SELECT 1 FROM celebrity_favorites cf WHERE cf.user_id = p.id)
  LOOP
    -- Notify referred user
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','referral_4day_no_purchase_to_user','recipient_type','user','recipient_id',v_user.id,
        'data',jsonb_build_object('first_name',COALESCE(v_user.first_name,'User'),'referrer_name','your friend')
      )::text,
      timeout_milliseconds := 5000
    );

    -- Notify referrer
    SELECT first_name INTO v_referrer FROM profiles WHERE id = v_user.referred_by;
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','referral_4day_reminder_to_referrer','recipient_type','user','recipient_id',v_user.referred_by,
        'data',jsonb_build_object('first_name',COALESCE(v_referrer.first_name,'User'),'friend_name',COALESCE(v_user.first_name,'your friend'))
      )::text,
      timeout_milliseconds := 5000
    );

    UPDATE profiles SET referral_4day_reminder_sent = true WHERE id = v_user.id;
  END LOOP;
END;
$$;

-- 5. Booking Deadline Reminder (daily)
CREATE OR REPLACE FUNCTION public.cron_booking_deadline_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_booking RECORD;
  v_celebrity_profile_id UUID;
  v_fan_name TEXT;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  FOR v_booking IN
    SELECT b.id, b.celebrity_id, b.user_id, b.delivery_date, b.service_type,
           c.name as celebrity_name, c.profile_id as celeb_profile_id
    FROM bookings b
    JOIN celebrities c ON c.id = b.celebrity_id
    WHERE b.status IN ('confirmed', 'pending')
      AND b.celebrity_reminder_sent IS NOT TRUE
      AND b.delivery_date IS NOT NULL
      AND b.delivery_date::date = CURRENT_DATE + 1
  LOOP
    SELECT COALESCE(first_name, 'Fan') INTO v_fan_name FROM profiles WHERE id = v_booking.user_id;

    IF v_booking.celeb_profile_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-wishme-notification',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
        body := jsonb_build_object(
          'event_key','booking_reminder_celebrity','recipient_type','celebrity','recipient_id',v_booking.celeb_profile_id,
          'data',jsonb_build_object('celebrity_name',v_booking.celebrity_name,'fan_name',v_fan_name,'occasion','Booking')
        )::text,
        timeout_milliseconds := 5000
      );
    END IF;

    UPDATE bookings SET celebrity_reminder_sent = true WHERE id = v_booking.id;
  END LOOP;
END;
$$;

-- 6. Monthly TDS Report (1st of month)
CREATE OR REPLACE FUNCTION public.cron_monthly_tds_reports()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
DECLARE
  v_celeb RECORD;
  v_month TEXT;
  v_year TEXT;
  v_gross NUMERIC;
  v_tds NUMERIC;
  v_net NUMERIC;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  v_month := TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'Month');
  v_year := TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY');

  FOR v_celeb IN
    SELECT c.id, c.name, c.profile_id
    FROM celebrities c
    WHERE c.profile_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(gross_amount),0), COALESCE(SUM(tds_amount),0), COALESCE(SUM(amount),0)
    INTO v_gross, v_tds, v_net
    FROM celebrity_wallet_transactions
    WHERE celebrity_id = v_celeb.id
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', CURRENT_DATE);

    IF v_gross > 0 THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-wishme-notification',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
        body := jsonb_build_object(
          'event_key','celebrity_tds_report_ready','recipient_type','celebrity','recipient_id',v_celeb.profile_id,
          'data',jsonb_build_object('celebrity_name',v_celeb.name,'month',v_month,'year',v_year,'gross',v_gross::text,'tds',v_tds::text,'net',v_net::text)
        )::text,
        timeout_milliseconds := 5000
      );
    END IF;
  END LOOP;
END;
$$;