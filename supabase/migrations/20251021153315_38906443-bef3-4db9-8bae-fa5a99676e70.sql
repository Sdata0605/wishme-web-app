-- Fix stuck UGC video generations that have scripts but are marked as processing
-- Mark all records with scripts as completed
UPDATE ugc_video_generations
SET 
  status = 'completed',
  completed_at = COALESCE(completed_at, created_at)
WHERE 
  status = 'processing' 
  AND script IS NOT NULL 
  AND script != ''
  AND completed_at IS NULL;