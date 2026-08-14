-- Add description column to wallet_transactions table for better transaction tracking
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS description TEXT;

-- Add description column to celebrity_wallet_transactions table for consistency
ALTER TABLE celebrity_wallet_transactions ALTER COLUMN description DROP NOT NULL;