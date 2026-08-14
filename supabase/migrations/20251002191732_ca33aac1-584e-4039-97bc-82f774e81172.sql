-- Add critical performance indexes for 10M+ user scale

-- Enable pg_trgm extension for fuzzy text search FIRST
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Celebrities table indexes
CREATE INDEX IF NOT EXISTS idx_celebrities_active_rating 
  ON celebrities(is_active, rating DESC) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_celebrities_category 
  ON celebrities(category) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_celebrities_created 
  ON celebrities(created_at DESC);

-- Bookings table indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_user_status 
  ON bookings(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_celebrity_created 
  ON bookings(celebrity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created 
  ON bookings(status, created_at DESC);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code 
  ON profiles(referral_code) 
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON profiles(role);

-- Celebrity reviews indexes
CREATE INDEX IF NOT EXISTS idx_celebrity_reviews_celebrity 
  ON celebrity_reviews(celebrity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_celebrity_reviews_user 
  ON celebrity_reviews(user_id, created_at DESC);

-- Occasion bookings indexes
CREATE INDEX IF NOT EXISTS idx_occasion_bookings_user 
  ON occasion_bookings(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_occasion_bookings_celebrity 
  ON occasion_bookings(celebrity_id, status);

-- Celebrity wallet transactions
CREATE INDEX IF NOT EXISTS idx_wallet_celebrity_created 
  ON celebrity_wallet_transactions(celebrity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_celebrity_status 
  ON celebrity_wallet_transactions(celebrity_id, status);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_celebrity_unread 
  ON celebrity_notifications(celebrity_id, is_read, created_at DESC);

-- Add composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_celebrities_category_rating 
  ON celebrities(category, rating DESC) 
  WHERE is_active = true;

-- Text search index for celebrity names (using GIN for pattern matching)
CREATE INDEX IF NOT EXISTS idx_celebrities_name_trgm 
  ON celebrities USING gin(name gin_trgm_ops);

COMMENT ON INDEX idx_celebrities_active_rating IS 'Optimizes default celebrity listing queries';
COMMENT ON INDEX idx_celebrities_category IS 'Optimizes category filter queries';
COMMENT ON INDEX idx_bookings_user_status IS 'Optimizes user booking history queries';
COMMENT ON INDEX idx_celebrities_name_trgm IS 'Enables fast fuzzy name search';