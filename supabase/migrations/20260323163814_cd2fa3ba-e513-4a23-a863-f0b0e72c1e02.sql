
-- Add new enum values to booking_status
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'video_sent';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'failed';

-- Add video_sent tracking columns to bookings
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS video_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS video_sent_by uuid REFERENCES public.profiles(id);
