-- Manually create the referral commission that was missed
-- Referrer: 7d208134-22dc-4cb8-8388-9278ae6b6532 (admin@wishme.today, basic plan = 5% L1)
-- Referred: b8cdbb70-4570-48c9-bb04-7591f2afa29a (32333@gmail.com, upgraded to elite = ₹999)
-- Commission: 5% of 999 = 49.95 ≈ 50

-- Create the referral transaction
INSERT INTO referral_transactions (referrer_id, referred_id, commission_level, commission_amount, status)
VALUES ('7d208134-22dc-4cb8-8388-9278ae6b6532', 'b8cdbb70-4570-48c9-bb04-7591f2afa29a', 1, 50, 'completed');

-- Credit the referrer's wallet
UPDATE profiles 
SET wallet_balance = COALESCE(wallet_balance, 0) + 50 
WHERE id = '7d208134-22dc-4cb8-8388-9278ae6b6532';

-- Record wallet transaction
INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
VALUES ('7d208134-22dc-4cb8-8388-9278ae6b6532', 50, 'referral_commission', 'completed', 
        'L1 referral commission from 32333@gmail.com plan upgrade to elite');