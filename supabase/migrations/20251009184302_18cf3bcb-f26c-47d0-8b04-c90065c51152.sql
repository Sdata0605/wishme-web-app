-- Clear existing sample celebrity data to refresh with realistic photos
DELETE FROM celebrity_media WHERE celebrity_id IN (
  SELECT id FROM celebrities WHERE image_url LIKE '%unsplash%'
);

DELETE FROM celebrities WHERE image_url LIKE '%unsplash%';