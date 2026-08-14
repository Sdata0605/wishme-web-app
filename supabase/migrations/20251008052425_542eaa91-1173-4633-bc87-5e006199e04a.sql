-- Add wallet balance and music pricing settings

-- Add wallet balance to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;

-- Create wallet transactions table for user deposits and admin credits
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'admin_credit', 'music_generation', 'music_download', 'commission_earning')),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  payment_method TEXT CHECK (payment_method IN ('upi', 'bank_transfer', 'online', 'admin')),
  payment_screenshot_url TEXT,
  transaction_details JSONB,
  admin_note TEXT,
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for wallet transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Enable RLS on wallet_transactions
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own deposit requests"
  ON wallet_transactions FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) 
    AND transaction_type = 'deposit'
    AND status = 'pending'
  );

CREATE POLICY "Admin can manage all wallet transactions"
  ON wallet_transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() AND p.role = 'admin'
  ));

-- Add music pricing settings to platform_settings
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES 
  ('music_lyrics_generation_price', '50', 'Price for generating lyrics (in currency units)'),
  ('music_song_generation_price', '100', 'Price for generating a song (in currency units)'),
  ('music_download_price', '20', 'Price for downloading generated music (in currency units)')
ON CONFLICT (setting_key) DO NOTHING;

-- Add TDS deduction tracking to celebrity_wallet_transactions
ALTER TABLE celebrity_wallet_transactions 
  ADD COLUMN IF NOT EXISTS tds_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_amount INTEGER;

-- Function to update wallet balance when transaction is approved
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Add amount to user's wallet
    UPDATE profiles 
    SET wallet_balance = wallet_balance + NEW.amount
    WHERE id = NEW.user_id;
    
    -- Mark as completed
    NEW.status := 'completed';
    NEW.processed_at := NOW();
  ELSIF NEW.status = 'completed' AND NEW.transaction_type IN ('withdrawal', 'music_generation', 'music_download') THEN
    -- Deduct amount from user's wallet
    UPDATE profiles 
    SET wallet_balance = wallet_balance - NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for wallet balance updates
DROP TRIGGER IF EXISTS trigger_update_wallet_balance ON wallet_transactions;
CREATE TRIGGER trigger_update_wallet_balance
  BEFORE UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_balance();

-- Update celebrity wallet transactions to calculate TDS
CREATE OR REPLACE FUNCTION calculate_celebrity_commission_with_tds()
RETURNS TRIGGER AS $$
DECLARE
  celebrity_commission_rate INTEGER;
  platform_tds_rate INTEGER;
  celebrity_pan_verified BOOLEAN;
  gross_commission NUMERIC;
  tds_amount NUMERIC;
  net_commission NUMERIC;
BEGIN
  -- Get celebrity commission percentage
  SELECT commission_percentage INTO celebrity_commission_rate
  FROM celebrities WHERE id = NEW.celebrity_id;
  
  IF celebrity_commission_rate IS NULL THEN
    celebrity_commission_rate := 70;
  END IF;
  
  -- Calculate gross commission
  gross_commission := NEW.amount;
  
  -- Get celebrity's PAN verification status
  SELECT p.pan_verified INTO celebrity_pan_verified
  FROM celebrities c
  JOIN profiles p ON c.profile_id = p.id
  WHERE c.id = NEW.celebrity_id;
  
  -- Get TDS rate
  IF celebrity_pan_verified = true THEN
    SELECT setting_value::INTEGER INTO platform_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_with_pan';
  ELSE
    SELECT setting_value::INTEGER INTO platform_tds_rate
    FROM platform_settings WHERE setting_key = 'tds_rate_without_pan';
  END IF;
  
  -- Set default TDS rate if not found
  IF platform_tds_rate IS NULL THEN
    platform_tds_rate := CASE WHEN celebrity_pan_verified THEN 10 ELSE 20 END;
  END IF;
  
  -- Calculate TDS and net commission
  tds_amount := (gross_commission * platform_tds_rate / 100);
  net_commission := gross_commission - tds_amount;
  
  -- Set values
  NEW.gross_amount := gross_commission;
  NEW.tds_percentage := platform_tds_rate;
  NEW.tds_amount := tds_amount;
  NEW.amount := net_commission;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for TDS calculation
DROP TRIGGER IF EXISTS trigger_calculate_tds ON celebrity_wallet_transactions;
CREATE TRIGGER trigger_calculate_tds
  BEFORE INSERT ON celebrity_wallet_transactions
  FOR EACH ROW
  WHEN (NEW.transaction_type = 'earning')
  EXECUTE FUNCTION calculate_celebrity_commission_with_tds();