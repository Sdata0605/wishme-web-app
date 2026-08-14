-- Add greeting_text column to wish_celebrity_orders table
ALTER TABLE wish_celebrity_orders
ADD COLUMN IF NOT EXISTS greeting_text TEXT;