-- Add missing discount columns to wish_celebrity_orders table
ALTER TABLE public.wish_celebrity_orders 
ADD COLUMN IF NOT EXISTS discount_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;