
-- Index for consent_status filter on active/verified celebrities
CREATE INDEX IF NOT EXISTS idx_celebrities_consent_status
  ON celebrities(consent_status)
  WHERE is_active = true AND is_verified = true;

-- Composite index for occasions lookup by celebrity + public flag
CREATE INDEX IF NOT EXISTS idx_celebrity_occasions_celebrity_public
  ON celebrity_occasions(celebrity_id, is_public)
  WHERE is_public = true;
