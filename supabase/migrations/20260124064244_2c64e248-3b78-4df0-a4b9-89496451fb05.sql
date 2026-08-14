-- Add task_id column to track Suno task for polling
ALTER TABLE public.user_singing_personas 
ADD COLUMN IF NOT EXISTS task_id TEXT;