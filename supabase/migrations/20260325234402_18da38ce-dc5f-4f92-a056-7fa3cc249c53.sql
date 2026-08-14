
-- Fix wallet for relaxoutyt0000@gmail.com: current balance is -15983, restore to 0 then add 2000
-- Compensating credit of 15983 to zero it out + 2000 test credit = 17983
INSERT INTO wallet_transactions (user_id, transaction_type, amount, status, description, admin_note)
VALUES ('72d6715c-7316-425a-81ee-3ac8b4b85c06', 'admin_credit', 17983, 'completed', 
  'Admin correction: reverse orphaned failed subscription debits (₹15983) + ₹2000 test credit',
  'Wallet repair: subscription failures caused negative balance due to non-atomic payment flow');
