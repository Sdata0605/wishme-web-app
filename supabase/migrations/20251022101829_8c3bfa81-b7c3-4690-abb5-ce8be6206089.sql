-- Phase 1: Add occasions field to loved_ones table
ALTER TABLE loved_ones 
ADD COLUMN IF NOT EXISTS occasions JSONB DEFAULT '[]'::jsonb;

-- Phase 6 & 7: Create wish_celebrity_orders table
CREATE TABLE IF NOT EXISTS wish_celebrity_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  celebrity_id UUID NOT NULL REFERENCES celebrities(id) ON DELETE CASCADE,
  occasion_type TEXT NOT NULL,
  message TEXT NOT NULL,
  card_url TEXT,
  card_prompt TEXT,
  reference_image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase 5: Update bookings table for delivery types
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'video' CHECK (delivery_type IN ('video', 'card', 'both')),
ADD COLUMN IF NOT EXISTS generated_prompt TEXT,
ADD COLUMN IF NOT EXISTS card_url TEXT;

-- Phase 10: Create delivery_type_pricing table
CREATE TABLE IF NOT EXISTS delivery_type_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_type TEXT NOT NULL UNIQUE CHECK (delivery_type IN ('video', 'card', 'both')),
  base_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO delivery_type_pricing (delivery_type, base_price)
VALUES 
  ('video', 0),
  ('card', 0),
  ('both', 0)
ON CONFLICT (delivery_type) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE wish_celebrity_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_type_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wish_celebrity_orders
CREATE POLICY "Users can view their own celebrity wishes"
ON wish_celebrity_orders
FOR SELECT
USING (auth.uid() IN (SELECT id FROM profiles WHERE id = wish_celebrity_orders.user_id));

CREATE POLICY "Users can create their own celebrity wishes"
ON wish_celebrity_orders
FOR INSERT
WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE id = wish_celebrity_orders.user_id));

CREATE POLICY "Users can update their own celebrity wishes"
ON wish_celebrity_orders
FOR UPDATE
USING (auth.uid() IN (SELECT id FROM profiles WHERE id = wish_celebrity_orders.user_id));

CREATE POLICY "Celebrities can view wishes to them"
ON wish_celebrity_orders
FOR SELECT
USING (
  auth.uid() IN (
    SELECT profile_id FROM celebrities WHERE id = wish_celebrity_orders.celebrity_id
  )
);

-- RLS Policies for delivery_type_pricing
CREATE POLICY "Anyone can view delivery pricing"
ON delivery_type_pricing
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage delivery pricing"
ON delivery_type_pricing
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wish_celebrity_orders_user_id ON wish_celebrity_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_wish_celebrity_orders_celebrity_id ON wish_celebrity_orders(celebrity_id);
CREATE INDEX IF NOT EXISTS idx_wish_celebrity_orders_status ON wish_celebrity_orders(status);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wish_celebrity_orders_updated_at
BEFORE UPDATE ON wish_celebrity_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_type_pricing_updated_at
BEFORE UPDATE ON delivery_type_pricing
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();