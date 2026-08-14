-- Add missing columns to wish_celebrity_orders table
ALTER TABLE wish_celebrity_orders 
ADD COLUMN IF NOT EXISTS generated_card_text TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recipient_name TEXT;