-- Add new columns to wish_celebrity_orders table for card generation and approval
ALTER TABLE wish_celebrity_orders
ADD COLUMN IF NOT EXISTS generation_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS generated_card_image_url TEXT,
ADD COLUMN IF NOT EXISTS card_approved BOOLEAN DEFAULT false;

-- Add check constraint for max attempts
ALTER TABLE wish_celebrity_orders
ADD CONSTRAINT check_generation_attempts CHECK (generation_attempts <= 3);