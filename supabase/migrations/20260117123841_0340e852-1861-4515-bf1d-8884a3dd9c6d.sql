-- Add scheduled_at column for scheduling celebrity calls
ALTER TABLE voice_call_wishes 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN voice_call_wishes.scheduled_at IS 'When the call should be made. NULL means call immediately.';