-- Create celebrity applications table for pending approvals
CREATE TABLE IF NOT EXISTS public.celebrity_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  date_of_birth date,
  stage_name text NOT NULL,
  category text,
  bio text NOT NULL,
  achievements text,
  portfolio_link text,
  social_media jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  applied_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES auth.users(id),
  created_celebrity_id uuid REFERENCES public.celebrities(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.celebrity_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create applications"
ON public.celebrity_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Users can view their own applications"
ON public.celebrity_applications
FOR SELECT
TO authenticated
USING (email = auth.jwt()->>'email');

CREATE POLICY "Admins can manage all applications"
ON public.celebrity_applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add index for email lookup
CREATE INDEX idx_celebrity_applications_email ON public.celebrity_applications(email);
CREATE INDEX idx_celebrity_applications_status ON public.celebrity_applications(status);

-- Update timestamp trigger
CREATE TRIGGER update_celebrity_applications_updated_at
BEFORE UPDATE ON public.celebrity_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();