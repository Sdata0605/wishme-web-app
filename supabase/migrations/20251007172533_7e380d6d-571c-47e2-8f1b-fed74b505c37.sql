-- Add pan_document_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pan_document_url TEXT;