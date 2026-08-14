CREATE OR REPLACE FUNCTION public.handle_auto_reply_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _celebrity_id uuid;
  _conversation_id uuid;
  _message_text text;
  _message_id uuid;
  _base_url text;
BEGIN
  IF NEW.sender_type != 'user' OR NEW.is_ai_generated = true THEN
    RETURN NEW;
  END IF;

  _conversation_id := NEW.conversation_id;
  _message_text := NEW.message_text;
  _message_id := NEW.id;

  SELECT celebrity_id INTO _celebrity_id
  FROM public.conversations
  WHERE id = _conversation_id;

  IF _celebrity_id IS NULL THEN
    RETURN NEW;
  END IF;

  _base_url := 'https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/celebrity-conversation-auto-reply';

  PERFORM net.http_post(
    url := _base_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y'
    ),
    body := jsonb_build_object(
      'conversationId', _conversation_id,
      'messageId', _message_id,
      'celebrityId', _celebrity_id,
      'messageText', _message_text
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_reply_trigger ON public.messages;
CREATE TRIGGER auto_reply_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_reply_on_message();