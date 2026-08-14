-- Add 1 lakh (100,000) dummy credits to kohn 234 (admin@rockstar.com)
UPDATE profiles 
SET wallet_balance = COALESCE(wallet_balance, 0) + 100000 
WHERE id = '1d294c5d-74c9-46b7-95bd-e43ea155b523';

-- Record the transaction
INSERT INTO wallet_transactions (user_id, amount, transaction_type, status, description)
VALUES ('1d294c5d-74c9-46b7-95bd-e43ea155b523', 100000, 'admin_credit', 'completed', 
        'Admin credited dummy test credits for development purposes');