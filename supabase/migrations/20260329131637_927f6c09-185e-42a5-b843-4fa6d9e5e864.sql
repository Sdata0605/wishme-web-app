CREATE OR REPLACE FUNCTION public.handle_auto_reply_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_celebrity_id UUID;
  v_auto_reply_enabled BOOLEAN := false;
BEGIN
  IF NEW.sender_type <> 'user' OR COALESCE(NEW.is_ai_generated, false) THEN
    RETURN NEW;
  END IF;

  SELECT c.celebrity_id
  INTO v_celebrity_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF v_celebrity_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(cs.ai_auto_reply_enabled, cs.auto_reply_enabled, false)
  INTO v_auto_reply_enabled
  FROM public.celebrity_settings cs
  WHERE cs.celebrity_id = v_celebrity_id;

  IF NOT COALESCE(v_auto_reply_enabled, false) THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://eqikeuqwbphwongtfzhe.supabase.co/functions/v1/celebrity-conversation-auto-reply',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxaWtldXF3YnBod29uZ3RmemhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzNDU3MjgsImV4cCI6MjA3MzkyMTcyOH0.OTmxqFKhXiHcEKoV0uuRCvhmkHkKGHNo-n7qpl_tW1Y'
    ),
    body := jsonb_build_object(
      'conversationId', NEW.conversation_id,
      'messageId', NEW.id,
      'messageText', NEW.message_text,
      'userMessage', NEW.message_text,
      'celebrityId', v_celebrity_id,
      'userId', NEW.sender_id
    )::text,
    timeout_milliseconds := 10000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Auto-reply trigger error: %', SQLERRM;
  RETURN NEW;
END;
$function$;