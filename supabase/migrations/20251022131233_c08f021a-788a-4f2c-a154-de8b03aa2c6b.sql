-- ============================================
-- FLOW 1: User Wishes Celebrity Enhancements
-- ============================================

-- Add payment and upload tracking to wish_celebrity_orders
ALTER TABLE wish_celebrity_orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS amount_paid INTEGER,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS user_uploaded_card_url TEXT,
  ADD COLUMN IF NOT EXISTS user_uploaded_video_url TEXT,
  ADD COLUMN IF NOT EXISTS card_generation_type TEXT DEFAULT 'ai';

-- Add conversation limit tracking
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS closed_reason TEXT,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS conversation_message_number INTEGER;

-- Conversation limit enforcement function
CREATE OR REPLACE FUNCTION public.check_conversation_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  celebrity_profile_id UUID;
  celebrity_name TEXT;
BEGIN
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
  
  -- Check if limit reached
  IF current_count = 14 AND NEW.sender_type = 'user' THEN
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
      'This is our last message exchange. Thank you for your wonderful wishes! 🌟',
      true,
      current_count + 1
    );
    
    -- Update count for warning message
    UPDATE conversations
    SET message_count = current_count + 1
    WHERE id = NEW.conversation_id;
  END IF;
  
  IF current_count >= 15 THEN
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
      RAISE EXCEPTION 'This conversation has been closed after 15 messages';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for conversation limits
DROP TRIGGER IF EXISTS enforce_conversation_limit ON messages;
CREATE TRIGGER enforce_conversation_limit
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION check_conversation_limit();

-- ============================================
-- FLOW 2 & 3: HeyGen Integration & Booking Enhancements
-- ============================================

-- Add HeyGen configuration to celebrities
ALTER TABLE celebrities
  ADD COLUMN IF NOT EXISTS heygen_avatar_id TEXT,
  ADD COLUMN IF NOT EXISTS heygen_voice_id TEXT;

-- Add video processing and order type to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS heygen_video_id TEXT,
  ADD COLUMN IF NOT EXISTS video_generation_method TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_relationship TEXT;

-- Update existing wish bookings to have correct order type
UPDATE bookings
SET order_type = 'celebrity_wish'
WHERE service_type = 'video_wish';

-- Create storage bucket for celebrity wish videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'celebrity-wish-videos',
  'celebrity-wish-videos',
  true,
  52428800, -- 50MB
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can upload wish videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view wish videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update wish videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete wish videos" ON storage.objects;

-- RLS policies for celebrity-wish-videos bucket
CREATE POLICY "Admins can upload wish videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'celebrity-wish-videos'
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Anyone can view wish videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'celebrity-wish-videos');

CREATE POLICY "Admins can update wish videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'celebrity-wish-videos'
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Admins can delete wish videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'celebrity-wish-videos'
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);