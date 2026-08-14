ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS recipient_verification_code TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS recipient_video_accessed BOOLEAN DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS recipient_video_accessed_at TIMESTAMPTZ;