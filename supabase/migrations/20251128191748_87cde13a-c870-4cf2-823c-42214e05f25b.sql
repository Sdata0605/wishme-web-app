-- Add video storage columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS video_file_key TEXT,
ADD COLUMN IF NOT EXISTS video_status TEXT DEFAULT 'pending';

-- Add index for faster video status queries
CREATE INDEX IF NOT EXISTS idx_bookings_video_status ON bookings(video_status);

-- Update existing bookings with video_url to have 'ready' status
UPDATE bookings 
SET video_status = 'ready' 
WHERE video_url IS NOT NULL AND video_status = 'pending';