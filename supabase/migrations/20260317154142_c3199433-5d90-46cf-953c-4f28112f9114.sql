-- Clean up expired and used OTP records to unblock rate-limited users
DELETE FROM public.email_otp_verifications
WHERE is_used = true OR expires_at < NOW();