-- Add audio_url column to user_vapi_voices table for storing B2 URLs
ALTER TABLE user_vapi_voices ADD COLUMN IF NOT EXISTS audio_url TEXT;