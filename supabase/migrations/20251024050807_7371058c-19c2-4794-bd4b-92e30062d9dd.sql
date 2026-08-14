-- Create trigger to auto-call celebrity reply edge function when user sends message
CREATE OR REPLACE FUNCTION trigger_celebrity_auto_reply()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conversation_record RECORD;
BEGIN
  -- Only trigger for user messages in non-closed conversations
  IF NEW.sender_type = 'user' THEN
    -- Get conversation details
    SELECT * INTO conversation_record
    FROM conversations
    WHERE id = NEW.conversation_id;
    
    -- Only auto-reply if conversation is not closed
    IF conversation_record.is_closed = false OR conversation_record.is_closed IS NULL THEN
      -- Call edge function asynchronously (fire and forget)
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/celebrity-conversation-auto-reply',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'conversationId', NEW.conversation_id::text,
          'userMessage', NEW.message_text
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS auto_reply_trigger ON messages;
CREATE TRIGGER auto_reply_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION trigger_celebrity_auto_reply();