-- Add columns to bookings table for direct HeyGen integration
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS script_content TEXT,
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS generation_error TEXT,
ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ;

-- Add HeyGen avatar and voice IDs to celebrities table (if not exist)
ALTER TABLE public.celebrities
ADD COLUMN IF NOT EXISTS heygen_avatar_id TEXT,
ADD COLUMN IF NOT EXISTS heygen_voice_id TEXT;

-- Create index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_bookings_generation_status ON public.bookings(generation_status);

-- Add comment explaining the status values
COMMENT ON COLUMN public.bookings.generation_status IS 'Video generation status: pending, script_generating, video_generating, downloading, uploading, completed, failed';