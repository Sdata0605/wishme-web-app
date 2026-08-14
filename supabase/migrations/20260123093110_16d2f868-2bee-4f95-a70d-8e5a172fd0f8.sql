-- Add admin_notes column to ugc_ads for storing generation details
ALTER TABLE public.ugc_ads 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Update status check constraint to include new statuses for manual workflow
ALTER TABLE public.ugc_ads 
DROP CONSTRAINT IF EXISTS ugc_ads_status_check;

ALTER TABLE public.ugc_ads 
ADD CONSTRAINT ugc_ads_status_check 
CHECK (status IN (
  'pending', 
  'pending_approval',
  'script_generating', 
  'video_generating', 
  'video_processing',
  'processing', 
  'completed', 
  'failed'
));