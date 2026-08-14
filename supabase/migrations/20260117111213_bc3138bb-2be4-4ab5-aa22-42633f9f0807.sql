-- Add vapi_phone_id column to celebrities table for individual phone number assignment
ALTER TABLE public.celebrities 
ADD COLUMN IF NOT EXISTS vapi_phone_id TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.celebrities.vapi_phone_id IS 'Vapi Phone Number ID for outbound calls using this celebrity voice';