-- Update all celebrities to have avatar_trained = true
UPDATE celebrities 
SET avatar_trained = true 
WHERE avatar_trained = false;