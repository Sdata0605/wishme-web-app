-- ═══════════════════════════════════════════════════════════════
-- SEED ALL NOTIFICATION EVENTS INTO message_events TABLE
-- ═══════════════════════════════════════════════════════════════

-- First ensure global toggles exist in platform_settings
INSERT INTO platform_settings (setting_key, setting_value) VALUES
  ('email_global_enabled', 'true'),
  ('sms_global_enabled', 'false'),
  ('whatsapp_global_enabled', 'true')
ON CONFLICT (setting_key) DO NOTHING;

-- Delete old uppercase events that are being replaced
DELETE FROM message_events WHERE event_key IN (
  'BIRTHDAY_REMINDER','BOOKING_CONFIRMED','CELEBRITY_WELCOME','INACTIVITY_REMINDER',
  'ORDER_COMPLETED','PAYMENT_ABANDONED','REVIEW_REQUEST','SCHEDULED_GIFT',
  'SUBSCRIPTION_RENEWED','USER_REGISTERED','USER_SUBSCRIBED_CELEBRITY','VIDEO_READY','WALLET_CREDITED'
);

-- Insert all new events (lowercase, matching edge function)
INSERT INTO message_events (event_key, description, is_enabled, email_enabled, sms_enabled, whatsapp_enabled, recipient_type, category, label) VALUES
  -- User Auth & Registration
  ('user_registered', 'When a new user completes signup', true, true, true, true, 'user', 'User Auth & Registration', 'User Registered'),
  ('admin_new_user_alert', 'Notify admin when a new user registers', true, true, false, false, 'admin', 'User Auth & Registration', 'New User Alert (Admin)'),
  ('celebrity_registered', 'When a celebrity submits their application', true, true, false, true, 'celebrity', 'User Auth & Registration', 'Celebrity Application Received'),
  ('admin_new_celebrity_alert', 'Notify admin of new celebrity application', true, true, false, false, 'admin', 'User Auth & Registration', 'New Celebrity Alert (Admin)'),
  ('user_login', 'New login detected (once per day)', false, true, false, false, 'user', 'User Auth & Registration', 'Login Notification'),
  ('email_otp_sent', 'When OTP is sent during signup or login', true, true, true, true, 'user', 'User Auth & Registration', 'OTP Verification'),
  ('password_reset_requested', 'When user requests password reset', true, true, false, false, 'user', 'User Auth & Registration', 'Password Reset Requested'),
  ('password_changed', 'When password is successfully changed', true, true, false, true, 'user', 'User Auth & Registration', 'Password Changed'),
  ('welcome_onboarding', 'Sent after email is verified', true, true, false, true, 'user', 'User Auth & Registration', 'Welcome / Onboarding'),

  -- Referral System
  ('referral_friend_joined', 'Notify referrer when someone joins via their link', true, true, true, true, 'referrer', 'Referral System', 'Referral Friend Joined'),
  ('referral_welcome_to_referred_user', 'Welcome message to user who joined via referral', true, true, false, true, 'user', 'Referral System', 'Welcome (Referred User)'),
  ('referral_commission_earned_l1', 'When L1 referrer earns commission', true, true, true, true, 'referrer', 'Referral System', 'L1 Commission Earned'),
  ('referral_commission_earned_l2', 'When L2 referrer earns commission', true, true, true, true, 'referrer', 'Referral System', 'L2 Commission Earned'),
  ('referral_4day_no_purchase_to_user', 'Remind referred user who has not purchased in 4 days', false, true, false, true, 'user', 'Referral System', '4-Day No Purchase (User)'),
  ('referral_4day_reminder_to_referrer', 'Remind referrer about inactive referred user', false, true, false, false, 'referrer', 'Referral System', '4-Day Reminder (Referrer)'),
  ('referral_milestone', 'When referrer hits 5, 10, 25 referrals', true, true, false, true, 'referrer', 'Referral System', 'Referral Milestone'),

  -- Bookings
  ('booking_placed_user', 'Confirm booking to the user who placed it', true, true, true, true, 'user', 'Bookings', 'Booking Placed (User)'),
  ('booking_placed_celebrity', 'Notify celebrity of new booking', true, true, false, true, 'celebrity', 'Bookings', 'Booking Placed (Celebrity)'),
  ('booking_placed_admin', 'Notify admin of new booking', true, true, false, false, 'admin', 'Bookings', 'Booking Placed (Admin)'),
  ('booking_confirmed', 'When admin approves/confirms booking', true, true, true, true, 'user', 'Bookings', 'Booking Confirmed'),
  ('booking_rejected', 'When admin rejects/cancels booking', true, true, true, true, 'user', 'Bookings', 'Booking Rejected'),
  ('booking_completed_user', 'Video/content ready for the user', true, true, true, true, 'user', 'Bookings', 'Booking Completed (User)'),
  ('booking_completed_recipient', 'Gift video sent to the recipient', true, true, false, true, 'recipient', 'Bookings', 'Booking Completed (Recipient)'),
  ('booking_reminder_celebrity', 'Remind celebrity 24h before deadline', true, true, false, true, 'celebrity', 'Bookings', 'Booking Reminder (Celebrity)'),

  -- Payments & Wallet
  ('payment_successful', 'After any successful payment', true, true, true, true, 'user', 'Payments & Wallet', 'Payment Successful'),
  ('payment_failed', 'When Razorpay payment fails', true, true, false, true, 'user', 'Payments & Wallet', 'Payment Failed'),
  ('wallet_topped_up', 'When user adds money to wallet', true, true, true, true, 'user', 'Payments & Wallet', 'Wallet Topped Up'),
  ('wallet_refunded', 'When refund is credited', true, true, true, true, 'user', 'Payments & Wallet', 'Wallet Refunded'),
  ('wallet_low_balance', 'When balance drops below 200 (once/week)', true, true, false, true, 'user', 'Payments & Wallet', 'Low Wallet Balance'),
  ('wallet_deducted', 'When wallet is debited for a service', true, true, true, false, 'user', 'Payments & Wallet', 'Wallet Deducted'),
  ('abandoned_cart', 'User started booking but did not pay', true, true, false, true, 'user', 'Payments & Wallet', 'Abandoned Cart'),

  -- Celebrity Events
  ('celebrity_application_approved', 'When admin approves celebrity application', true, true, false, true, 'celebrity', 'Celebrity Events', 'Application Approved'),
  ('celebrity_application_rejected', 'When admin rejects application', true, true, false, false, 'celebrity', 'Celebrity Events', 'Application Rejected'),
  ('celebrity_payout_requested_admin', 'Notify admin of payout request', true, true, false, false, 'admin', 'Celebrity Events', 'Payout Requested (Admin)'),
  ('celebrity_payout_processed', 'When withdrawal is processed', true, true, true, true, 'celebrity', 'Celebrity Events', 'Payout Processed'),
  ('celebrity_new_subscriber', 'When a fan subscribes to celebrity', true, true, false, true, 'celebrity', 'Celebrity Events', 'New Subscriber'),
  ('celebrity_commission_credited', 'After booking completes and commission is calculated', true, true, false, false, 'celebrity', 'Celebrity Events', 'Commission Credited'),
  ('celebrity_low_balance', 'When celebrity balance drops below 500', false, true, false, false, 'celebrity', 'Celebrity Events', 'Low Balance Alert'),
  ('celebrity_tds_report_ready', 'Monthly TDS report for celebrity', true, true, false, false, 'celebrity', 'Celebrity Events', 'TDS Report Ready'),

  -- AI Services
  ('music_generation_completed', 'When AI music is ready', true, true, false, true, 'user', 'AI Services', 'Music Generation Completed'),
  ('music_generation_failed', 'When music generation fails', true, true, false, false, 'user', 'AI Services', 'Music Generation Failed'),
  ('greeting_card_ready', 'When AI greeting card is generated', true, true, false, true, 'user', 'AI Services', 'Greeting Card Ready'),
  ('photo_wish_completed', 'When photo wish is ready', true, true, false, true, 'user', 'AI Services', 'Photo Wish Completed'),
  ('voice_call_scheduled', 'Confirmation of voice call', true, true, true, true, 'user', 'AI Services', 'Voice Call Scheduled'),
  ('voice_call_completed', 'After voice call is completed', true, true, false, false, 'user', 'AI Services', 'Voice Call Completed'),
  ('voice_call_reminder', '30 min before scheduled call', true, false, true, true, 'user', 'AI Services', 'Voice Call Reminder'),

  -- Subscriptions & Plans
  ('celebrity_subscription_confirmed', 'When user subscribes to celebrity', true, true, false, true, 'user', 'Subscriptions & Plans', 'Subscription Confirmed'),
  ('celebrity_subscription_expiring', '3 days before subscription expiry', true, true, false, true, 'user', 'Subscriptions & Plans', 'Subscription Expiring'),
  ('celebrity_subscription_expired', 'When subscription has expired', true, true, false, false, 'user', 'Subscriptions & Plans', 'Subscription Expired'),
  ('plan_upgraded', 'When user upgrades their plan', true, true, true, true, 'user', 'Subscriptions & Plans', 'Plan Upgraded'),
  ('plan_expiring', '5 days before plan expires', true, true, false, true, 'user', 'Subscriptions & Plans', 'Plan Expiring Soon'),
  ('plan_expired', 'When plan has expired', true, true, false, false, 'user', 'Subscriptions & Plans', 'Plan Expired'),

  -- Occasions & Reminders
  ('occasion_reminder', 'Remind user of upcoming occasion', true, true, true, true, 'user', 'Occasions & Reminders', 'Occasion Reminder'),

  -- Newsletter & Updates
  ('newsletter_welcome', 'When someone subscribes to newsletter', true, true, false, false, 'user', 'Newsletter & Updates', 'Newsletter Welcome'),
  ('newsletter_new_celebrity', 'Notify subscribers of new celebrity', true, true, false, false, 'user', 'Newsletter & Updates', 'New Celebrity Announcement'),
  ('newsletter_new_feature', 'Admin-triggered feature announcement', true, true, false, false, 'user', 'Newsletter & Updates', 'New Feature Announcement')
ON CONFLICT (event_key) DO UPDATE SET
  description = EXCLUDED.description,
  recipient_type = EXCLUDED.recipient_type,
  category = EXCLUDED.category,
  label = EXCLUDED.label;

-- ═══════════════════════════════════════════════════════════════
-- DB TRIGGER: Notify on booking status change  
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
  v_user_name TEXT;
  v_celebrity_name TEXT;
  v_celebrity_profile_id UUID;
  v_payment_id TEXT;
  v_event_key TEXT;
BEGIN
  -- Get names
  SELECT COALESCE(first_name, 'User') INTO v_user_name FROM profiles WHERE id = NEW.user_id;
  SELECT name, profile_id INTO v_celebrity_name, v_celebrity_profile_id FROM celebrities WHERE id = NEW.celebrity_id;
  SELECT wishme_payment_id INTO v_payment_id FROM payment_transactions WHERE booking_id = NEW.id LIMIT 1;

  -- Booking placed (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Notify user
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','booking_placed_user','recipient_type','user','recipient_id',NEW.user_id,
        'data',jsonb_build_object('first_name',v_user_name,'celebrity_name',COALESCE(v_celebrity_name,'Celebrity'),'payment_id',COALESCE(v_payment_id,LEFT(NEW.id::text,8)),'amount',NEW.final_price::text,'service_type',NEW.service_type::text,'delivery_days','3')
      )::text,
      timeout_milliseconds := 5000
    );
    -- Notify celebrity
    IF v_celebrity_profile_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-wishme-notification',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
        body := jsonb_build_object(
          'event_key','booking_placed_celebrity','recipient_type','celebrity','recipient_id',v_celebrity_profile_id,
          'data',jsonb_build_object('celebrity_name',COALESCE(v_celebrity_name,'Celebrity'),'fan_name',v_user_name,'service_type',NEW.service_type::text,'occasion','Booking','celebrity_earning',COALESCE(NEW.celebrity_commission,0)::text)
        )::text,
        timeout_milliseconds := 5000
      );
    END IF;
    -- Notify admin
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','booking_placed_admin','recipient_type','admin',
        'data',jsonb_build_object('payment_id',COALESCE(v_payment_id,LEFT(NEW.id::text,8)),'amount',NEW.final_price::text,'user_name',v_user_name,'celebrity_name',COALESCE(v_celebrity_name,'Celebrity'),'service_type',NEW.service_type::text)
      )::text,
      timeout_milliseconds := 5000
    );
    RETURN NEW;
  END IF;

  -- Status change (UPDATE)
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
      v_event_key := 'booking_confirmed';
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-wishme-notification',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
        body := jsonb_build_object(
          'event_key',v_event_key,'recipient_type','user','recipient_id',NEW.user_id,
          'data',jsonb_build_object('first_name',v_user_name,'celebrity_name',COALESCE(v_celebrity_name,'Celebrity'),'delivery_date',COALESCE(NEW.delivery_date::text,'3 days'))
        )::text,
        timeout_milliseconds := 5000
      );
    ELSIF NEW.status = 'rejected' OR NEW.status = 'cancelled' THEN
      v_event_key := 'booking_rejected';
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-wishme-notification',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
        body := jsonb_build_object(
          'event_key',v_event_key,'recipient_type','user','recipient_id',NEW.user_id,
          'data',jsonb_build_object('first_name',v_user_name,'celebrity_name',COALESCE(v_celebrity_name,'Celebrity'),'amount',NEW.final_price::text)
        )::text,
        timeout_milliseconds := 5000
      );
    ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      v_event_key := 'booking_completed_user';
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-wishme-notification',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
        body := jsonb_build_object(
          'event_key',v_event_key,'recipient_type','user','recipient_id',NEW.user_id,
          'data',jsonb_build_object('first_name',v_user_name,'celebrity_name',COALESCE(v_celebrity_name,'Celebrity'),'video_url',COALESCE(NEW.video_url,''),'verification_code',COALESCE(NEW.recipient_verification_code,''),'payment_id',COALESCE(v_payment_id,LEFT(NEW.id::text,8)))
        )::text,
        timeout_milliseconds := 5000
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_booking_status_change error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any and create new one
DROP TRIGGER IF EXISTS trg_notify_booking_status ON bookings;
CREATE TRIGGER trg_notify_booking_status
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_booking_status_change();

-- ═══════════════════════════════════════════════════════════════
-- DB TRIGGER: Notify on wallet transaction (referral commission)
-- Replace existing notify_referral_earning with unified version
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_referral_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_name TEXT;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  IF NEW.transaction_type <> 'referral_commission' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(first_name, 'User') INTO v_referrer_name FROM profiles WHERE id = NEW.user_id;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-wishme-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
    body := jsonb_build_object(
      'event_key','referral_commission_earned_l1','recipient_type','user','recipient_id',NEW.user_id,
      'data',jsonb_build_object('first_name',v_referrer_name,'amount',NEW.amount::text,'friend_name','a friend','total_earnings','')
    )::text,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_referral_earning error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- DB TRIGGER: Notify on wallet deposit (top-up)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_wallet_topup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_name TEXT;
  v_new_balance INTEGER;
  v_payment_id TEXT;
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF NEW.transaction_type = 'referral_commission' THEN RETURN NEW; END IF;

  SELECT COALESCE(first_name,'User'), COALESCE(wallet_balance,0) INTO v_user_name, v_new_balance FROM profiles WHERE id = NEW.user_id;

  IF NEW.transaction_type = 'deposit' OR NEW.transaction_type = 'admin_credit' THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','wallet_topped_up','recipient_type','user','recipient_id',NEW.user_id,
        'data',jsonb_build_object('first_name',v_user_name,'amount',NEW.amount::text,'payment_id',COALESCE(NEW.razorpay_payment_id,''),'new_balance',v_new_balance::text)
      )::text,
      timeout_milliseconds := 5000
    );
  END IF;

  -- Check low balance
  IF v_new_balance < 200 THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','wallet_low_balance','recipient_type','user','recipient_id',NEW.user_id,
        'data',jsonb_build_object('first_name',v_user_name,'balance',v_new_balance::text)
      )::text,
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_wallet_topup error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_wallet_topup ON wallet_transactions;
CREATE TRIGGER trg_notify_wallet_topup
  AFTER INSERT ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_wallet_topup();

-- ═══════════════════════════════════════════════════════════════
-- DB TRIGGER: Notify on celebrity application status change
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_celebrity_application_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url TEXT := 'https://eqikeuqwbphwongtfzhe.supabase.co';
  v_anon_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y';
  v_event_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New application
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','admin_new_celebrity_alert','recipient_type','admin',
        'data',jsonb_build_object('celebrity_name',NEW.stage_name,'category',COALESCE(NEW.category,''))
      )::text,
      timeout_milliseconds := 5000
    );
    -- Confirm to applicant
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key','celebrity_registered','recipient_type','user',
        'data',jsonb_build_object('first_name',NEW.first_name,'celebrity_name',NEW.stage_name,'recipient_email',NEW.email,'recipient_phone',NEW.phone)
      )::text,
      timeout_milliseconds := 5000
    );
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      v_event_key := 'celebrity_application_approved';
    ELSIF NEW.status = 'rejected' THEN
      v_event_key := 'celebrity_application_rejected';
    ELSE
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-wishme-notification',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key,'apikey',v_anon_key),
      body := jsonb_build_object(
        'event_key',v_event_key,'recipient_type','user',
        'data',jsonb_build_object('celebrity_name',NEW.stage_name,'recipient_email',NEW.email,'recipient_phone',NEW.phone)
      )::text,
      timeout_milliseconds := 5000
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_celebrity_application_status error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_celebrity_application ON celebrity_applications;
CREATE TRIGGER trg_notify_celebrity_application
  AFTER INSERT OR UPDATE ON celebrity_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_celebrity_application_status();