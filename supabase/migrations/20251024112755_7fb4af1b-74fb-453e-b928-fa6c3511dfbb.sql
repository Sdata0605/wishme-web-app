-- Add platform settings for conversation message limits
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES 
  ('conversation_message_limit', '200', 'Maximum number of messages allowed per conversation'),
  ('conversation_warning_offset', '10', 'Number of messages before limit to show warning'),
  ('conversation_limit_enabled', 'true', 'Whether to enforce conversation message limits')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

-- Update the check_conversation_limit function to use dynamic settings
CREATE OR REPLACE FUNCTION public.check_conversation_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  celebrity_profile_id UUID;
  celebrity_name TEXT;
  message_limit INTEGER;
  warning_offset INTEGER;
  limit_enabled BOOLEAN;
  warning_threshold INTEGER;
BEGIN
  -- Get limit settings from platform_settings
  SELECT setting_value::INTEGER INTO message_limit
  FROM platform_settings
  WHERE setting_key = 'conversation_message_limit';
  
  SELECT setting_value::INTEGER INTO warning_offset
  FROM platform_settings
  WHERE setting_key = 'conversation_warning_offset';
  
  SELECT setting_value::BOOLEAN INTO limit_enabled
  FROM platform_settings
  WHERE setting_key = 'conversation_limit_enabled';
  
  -- Set defaults if not found
  message_limit := COALESCE(message_limit, 200);
  warning_offset := COALESCE(warning_offset, 10);
  limit_enabled := COALESCE(limit_enabled, true);
  
  -- Calculate warning threshold
  warning_threshold := message_limit - warning_offset;
  
  -- Get current message count
  SELECT message_count INTO current_count
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Increment count
  current_count := COALESCE(current_count, 0) + 1;
  
  -- Set message number
  NEW.conversation_message_number := current_count;
  
  -- Update conversation count
  UPDATE conversations
  SET message_count = current_count
  WHERE id = NEW.conversation_id;
  
  -- Only enforce limits if enabled
  IF limit_enabled THEN
    -- Check if warning threshold reached
    IF current_count = warning_threshold AND NEW.sender_type = 'user' THEN
      -- Get celebrity info for warning message
      SELECT c.profile_id, c.name INTO celebrity_profile_id, celebrity_name
      FROM conversations conv
      JOIN celebrities c ON c.id = conv.celebrity_id
      WHERE conv.id = NEW.conversation_id;
      
      -- Insert warning message from celebrity
      INSERT INTO messages (
        conversation_id,
        sender_id,
        sender_type,
        message_text,
        is_ai_generated,
        conversation_message_number
      ) VALUES (
        NEW.conversation_id,
        celebrity_profile_id,
        'celebrity',
        'We have ' || warning_offset || ' messages left in our conversation. Thank you for your wonderful wishes! 🌟',
        true,
        current_count + 1
      );
      
      -- Update count for warning message
      UPDATE conversations
      SET message_count = current_count + 1
      WHERE id = NEW.conversation_id;
    END IF;
    
    -- Check if limit reached
    IF current_count >= message_limit THEN
      -- Get celebrity info for closing message
      SELECT c.profile_id, c.name INTO celebrity_profile_id, celebrity_name
      FROM conversations conv
      JOIN celebrities c ON c.id = conv.celebrity_id
      WHERE conv.id = NEW.conversation_id;
      
      -- Close conversation
      UPDATE conversations
      SET is_closed = true,
          closed_reason = 'message_limit_reached',
          closed_at = NOW()
      WHERE id = NEW.conversation_id;
      
      -- Insert closing message if not already closed
      IF NOT EXISTS (
        SELECT 1 FROM conversations 
        WHERE id = NEW.conversation_id AND is_closed = true
      ) THEN
        INSERT INTO messages (
          conversation_id,
          sender_id,
          sender_type,
          message_text,
          is_ai_generated,
          conversation_message_number
        ) VALUES (
          NEW.conversation_id,
          celebrity_profile_id,
          'celebrity',
          'Our conversation has reached its limit. Wishing you all the best! Keep spreading joy! 💫',
          true,
          current_count + 1
        );
      END IF;
      
      -- Block further user messages
      IF NEW.sender_type = 'user' THEN
        RAISE EXCEPTION 'This conversation has been closed after reaching the message limit';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Reopen all conversations that were closed due to message limit
UPDATE conversations
SET is_closed = false,
    closed_reason = NULL,
    closed_at = NULL
WHERE closed_reason = 'message_limit_reached';