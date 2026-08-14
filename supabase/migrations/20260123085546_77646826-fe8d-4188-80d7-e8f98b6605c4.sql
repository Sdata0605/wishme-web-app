-- Add celebrity_id column to ugc_ads table to link UGC ads with specific celebrities
ALTER TABLE public.ugc_ads 
ADD COLUMN IF NOT EXISTS celebrity_id uuid REFERENCES public.celebrities(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_ugc_ads_celebrity ON public.ugc_ads(celebrity_id);

-- Add a comment for documentation
COMMENT ON COLUMN public.ugc_ads.celebrity_id IS 'The celebrity associated with this UGC ad, used for celebrity-specific avatar/voice and pricing';