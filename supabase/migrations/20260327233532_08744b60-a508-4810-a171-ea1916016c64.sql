-- Schedule cron jobs for notification system
SELECT cron.schedule('daily-occasion-reminders', '0 8 * * *', $$SELECT public.cron_occasion_reminders()$$);
SELECT cron.schedule('daily-subscription-expiry', '0 9 * * *', $$SELECT public.cron_subscription_expiry()$$);
SELECT cron.schedule('daily-plan-expiry', '5 9 * * *', $$SELECT public.cron_plan_expiry()$$);
SELECT cron.schedule('daily-referral-reminders', '0 10 * * *', $$SELECT public.cron_referral_reminders()$$);
SELECT cron.schedule('daily-booking-deadline-reminders', '30 8 * * *', $$SELECT public.cron_booking_deadline_reminders()$$);
SELECT cron.schedule('monthly-tds-reports', '0 10 1 * *', $$SELECT public.cron_monthly_tds_reports()$$);