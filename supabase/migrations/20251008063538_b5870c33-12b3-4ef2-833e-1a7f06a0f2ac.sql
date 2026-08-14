-- Add platform settings for greeting card configuration
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('greeting_card_price', '2', 'Price per greeting card generation in INR'),
('greeting_card_enabled', 'true', 'Enable/disable greeting card generation feature'),
('greeting_card_bundle_size', '5', 'Number of greeting cards per bundle'),
('greeting_card_bundle_discount', '20', 'Percentage discount for bundle purchases');

-- Create greeting card generations table
CREATE TABLE greeting_card_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Prompt management
  original_prompt TEXT NOT NULL,
  refined_prompt TEXT,
  prompt_refinement_used BOOLEAN DEFAULT false,
  
  -- Image handling
  reference_image_url TEXT,
  reference_image_source TEXT CHECK (reference_image_source IN ('upload', 'library', 'camera', 'none')),
  generated_image_url TEXT,
  
  -- Occasion details
  occasion_name TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  greeting_text TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Library management
  saved_to_library BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Pricing
  amount_charged INTEGER NOT NULL DEFAULT 2
);

-- Create indexes for performance
CREATE INDEX idx_greeting_cards_user_id ON greeting_card_generations(user_id);
CREATE INDEX idx_greeting_cards_status ON greeting_card_generations(status);
CREATE INDEX idx_greeting_cards_library ON greeting_card_generations(user_id, saved_to_library);
CREATE INDEX idx_greeting_cards_created ON greeting_card_generations(created_at DESC);

-- Enable RLS
ALTER TABLE greeting_card_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own greeting cards"
  ON greeting_card_generations FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create greeting cards"
  ON greeting_card_generations FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own greeting cards"
  ON greeting_card_generations FOR UPDATE
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can view all greeting cards"
  ON greeting_card_generations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create storage bucket for user-uploaded reference images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('greeting-card-uploads', 'greeting-card-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload their own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'greeting-card-uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'greeting-card-uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view greeting card uploads"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'greeting-card-uploads');