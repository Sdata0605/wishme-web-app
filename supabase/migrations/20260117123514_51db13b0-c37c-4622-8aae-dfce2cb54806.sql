-- Add 2 lakhs (₹200,000) dummy credits to john@joe.com wallet
INSERT INTO wallet_transactions (user_id, transaction_type, amount, status, payment_method, admin_note, processed_at)
VALUES (
  '51f5992e-f196-4935-bf59-79fd5957f584',
  'admin_credit',
  200000,
  'completed',
  'admin',
  'Dummy credits added for testing',
  now()
);