-- Add profile completion fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN address TEXT,
ADD COLUMN bank_account_number TEXT,
ADD COLUMN bank_name TEXT,
ADD COLUMN bank_ifsc TEXT,
ADD COLUMN bank_account_holder_name TEXT,
ADD COLUMN aadhaar_number TEXT,
ADD COLUMN pan_number TEXT,
ADD COLUMN aadhaar_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN pan_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN profile_completion_percentage INTEGER DEFAULT 20;

-- Create index for better performance on verification status
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status 
ON public.profiles (aadhaar_verified, pan_verified);