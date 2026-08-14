-- Mark stuck personas as failed so users see the correct status
UPDATE user_singing_personas 
SET status = 'failed' 
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '30 minutes';