-- Add ₹50,000 to user@wishme.com wallet
UPDATE profiles 
SET wallet_balance = wallet_balance + 50000 
WHERE email = 'user@wishme.com';

-- Insert transaction record for audit trail
INSERT INTO wallet_transactions (user_id, transaction_type, amount, status, admin_note)
SELECT id, 'admin_credit', 50000, 'completed', 'Initial admin credit - ₹50,000'
FROM profiles
WHERE email = 'user@wishme.com';

-- Enable Celebrity Favorites for All Active Celebrities
INSERT INTO celebrity_favorite_pricing (celebrity_id, price, is_enabled)
SELECT id, 999, true 
FROM celebrities 
WHERE is_active = true 
AND id NOT IN (SELECT celebrity_id FROM celebrity_favorite_pricing);