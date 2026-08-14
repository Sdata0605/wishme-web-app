-- Clean up broken media library videos since B2 bucket was cleared
DELETE FROM media_library 
WHERE file_type = 'video' 
AND category IN ('banner', 'featured');