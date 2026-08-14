-- Add VAPI voice fields to celebrities table
ALTER TABLE public.celebrities 
ADD COLUMN IF NOT EXISTS vapi_voice_id TEXT,
ADD COLUMN IF NOT EXISTS voice_call_price INTEGER DEFAULT 500;

-- Add celebrity_id to voice_call_wishes table
ALTER TABLE public.voice_call_wishes
ADD COLUMN IF NOT EXISTS celebrity_id UUID REFERENCES public.celebrities(id),
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_celebrities_vapi_voice ON public.celebrities(vapi_voice_id) WHERE vapi_voice_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.celebrities.vapi_voice_id IS 'VAPI AI voice ID for celebrity voice calls';
COMMENT ON COLUMN public.celebrities.voice_call_price IS 'Price in INR for voice call wish using celebrity voice';
COMMENT ON COLUMN public.voice_call_wishes.celebrity_id IS 'Celebrity whose voice is used for the call';
COMMENT ON COLUMN public.voice_call_wishes.sender_name IS 'Name of the person sending the wish';