-- Add test funds to specific users
UPDATE profiles 
SET wallet_balance = wallet_balance + 50000 
WHERE email IN ('User@wishme.com', 'nalininh@gmail.com');