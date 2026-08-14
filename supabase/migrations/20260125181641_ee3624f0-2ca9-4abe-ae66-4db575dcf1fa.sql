-- Create table for email OTP verifications
CREATE TABLE IF NOT EXISTS public.email_otp_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_otp_email ON public.email_otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_otp_expires ON public.email_otp_verifications(expires_at);

-- Create table for tracking verified emails (temporary cache)
CREATE TABLE IF NOT EXISTS public.verified_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verified_emails_email ON public.verified_emails(email);

-- Enable RLS on both tables
ALTER TABLE public.email_otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_emails ENABLE ROW LEVEL SECURITY;

-- RLS policies - only service role can access (edge functions)
-- No public access policies needed as these are managed by edge functions

-- Function to clean up expired OTPs (can be called by a cron job)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete expired OTP records older than 24 hours
  DELETE FROM public.email_otp_verifications
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  -- Delete expired verified emails
  DELETE FROM public.verified_emails
  WHERE expires_at < NOW();
END;
$$;