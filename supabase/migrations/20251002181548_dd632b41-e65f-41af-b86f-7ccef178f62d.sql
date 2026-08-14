-- Create celebrity_reviews table for user reviews and ratings
CREATE TABLE public.celebrity_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  celebrity_id UUID NOT NULL REFERENCES public.celebrities(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.celebrity_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all reviews" 
ON public.celebrity_reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create reviews for their bookings" 
ON public.celebrity_reviews 
FOR INSERT 
WITH CHECK (
  user_id IN ( SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()) 
  AND 
  booking_id IN (SELECT b.id FROM bookings b WHERE b.user_id = user_id AND b.status = 'completed')
);

CREATE POLICY "Users can update their own reviews" 
ON public.celebrity_reviews 
FOR UPDATE 
USING (user_id IN ( SELECT p.id FROM profiles p WHERE p.user_id = auth.uid()));

CREATE POLICY "Admin can manage all reviews" 
ON public.celebrity_reviews 
FOR ALL 
USING (EXISTS ( SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_celebrity_reviews_updated_at
BEFORE UPDATE ON public.celebrity_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update celebrity rating when review is added/updated
CREATE OR REPLACE FUNCTION public.update_celebrity_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating NUMERIC;
  review_cnt INTEGER;
BEGIN
  -- Calculate average rating and count for the celebrity
  SELECT 
    ROUND(AVG(rating)::numeric, 1),
    COUNT(*)
  INTO avg_rating, review_cnt
  FROM celebrity_reviews
  WHERE celebrity_id = COALESCE(NEW.celebrity_id, OLD.celebrity_id);
  
  -- Update celebrity table
  UPDATE celebrities
  SET 
    rating = COALESCE(avg_rating, 0),
    review_count = COALESCE(review_cnt, 0)
  WHERE id = COALESCE(NEW.celebrity_id, OLD.celebrity_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to update celebrity rating
CREATE TRIGGER update_celebrity_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.celebrity_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_celebrity_rating();