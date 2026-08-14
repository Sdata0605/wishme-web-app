-- Add profile completion fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS 
  address TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  bank_ifsc TEXT,
  bank_account_holder_name TEXT,
  aadhaar_number TEXT,
  pan_number TEXT,
  aadhaar_verified BOOLEAN DEFAULT FALSE,
  pan_verified BOOLEAN DEFAULT FALSE,
  profile_completion_percentage INTEGER DEFAULT 20;

-- Create index for better performance on verification status
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status 
ON public.profiles (aadhaar_verified, pan_verified);