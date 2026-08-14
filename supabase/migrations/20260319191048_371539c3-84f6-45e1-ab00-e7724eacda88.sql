
DROP TRIGGER IF EXISTS trigger_image_promotion_referral_commission ON image_promotions;

CREATE TRIGGER trigger_image_promotion_referral_commission
  AFTER UPDATE ON image_promotions
  FOR EACH ROW
  EXECUTE FUNCTION process_image_promotion_referral_commission();

DROP TRIGGER IF EXISTS trigger_celebrity_favorite_referral_commission ON celebrity_favorites;

CREATE TRIGGER trigger_celebrity_favorite_referral_commission
  AFTER INSERT ON celebrity_favorites
  FOR EACH ROW
  EXECUTE FUNCTION process_celebrity_favorite_referral_commission();

-- Fix historical wallet balance discrepancies
UPDATE profiles SET wallet_balance = 98851 WHERE email = 'admin@rockstar.com';
UPDATE profiles SET wallet_balance = 5827 WHERE email = 'admin@wishme.com';
UPDATE profiles SET wallet_balance = 200000 WHERE email = 'john@joe.com';
UPDATE profiles SET wallet_balance = 47461 WHERE email = 'user@wishme.com';
UPDATE profiles SET wallet_balance = 111 WHERE email = 'admin@wishme.today';
