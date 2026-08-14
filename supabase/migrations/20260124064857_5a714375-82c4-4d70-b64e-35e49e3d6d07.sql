-- Allow clip_id to be null during processing phase
ALTER TABLE public.user_singing_personas 
ALTER COLUMN clip_id DROP NOT NULL;