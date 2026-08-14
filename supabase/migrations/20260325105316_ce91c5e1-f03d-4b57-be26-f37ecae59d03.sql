-- Clean orphaned booking_ids that don't exist in bookings table
UPDATE referral_transactions SET booking_id = NULL WHERE booking_id IS NOT NULL AND booking_id NOT IN (SELECT id FROM bookings);

-- Now add the foreign key constraint
ALTER TABLE referral_transactions ADD CONSTRAINT referral_transactions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;