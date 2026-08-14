-- Make promotional-content bucket public so HeyGen can access images
UPDATE storage.buckets 
SET public = true 
WHERE id = 'promotional-content';