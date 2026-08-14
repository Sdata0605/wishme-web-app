-- Drop the broken database trigger for auto-reply
-- This trigger was failing because pg_net extension is not available
-- and configuration variables are not set. Auto-reply is now handled client-side.

DROP TRIGGER IF EXISTS auto_reply_trigger ON messages;
DROP FUNCTION IF EXISTS trigger_celebrity_auto_reply();