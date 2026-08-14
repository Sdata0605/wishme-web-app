-- Add new columns to ugc_video_generations table for enhanced tracking
ALTER TABLE ugc_video_generations
ADD COLUMN IF NOT EXISTS heygen_video_id TEXT,
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gemini-2.5-flash',
ADD COLUMN IF NOT EXISTS thumbnail_generated_by_ai BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;

-- Make script column nullable since it starts empty
ALTER TABLE ugc_video_generations
ALTER COLUMN script DROP NOT NULL;

-- Add thumbnail_url column if it doesn't exist
ALTER TABLE ugc_video_generations
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;