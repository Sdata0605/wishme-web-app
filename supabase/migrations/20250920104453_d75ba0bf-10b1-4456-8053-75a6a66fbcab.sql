-- Create countries table
CREATE TABLE public.countries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create states table
CREATE TABLE public.states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  code text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(name, country_id)
);

-- Create areas table  
CREATE TABLE public.areas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  state_id uuid NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  pincode text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(name, state_id, pincode)
);

-- Enable RLS for all tables
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Countries policies
CREATE POLICY "Admin can manage countries" ON public.countries FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Everyone can view active countries" ON public.countries FOR SELECT USING (is_active = true);

-- States policies  
CREATE POLICY "Admin can manage states" ON public.states FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Everyone can view active states" ON public.states FOR SELECT USING (is_active = true);

-- Areas policies
CREATE POLICY "Admin can manage areas" ON public.areas FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
);

CREATE POLICY "Everyone can view active areas" ON public.areas FOR SELECT USING (is_active = true);

-- Add indexes for better performance
CREATE INDEX idx_states_country_id ON public.states(country_id);
CREATE INDEX idx_areas_state_id ON public.areas(state_id);
CREATE INDEX idx_areas_pincode ON public.areas(pincode);

-- Insert India as default country
INSERT INTO public.countries (name, code) VALUES ('India', 'IN');

-- Create triggers for updated_at
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_states_updated_at BEFORE UPDATE ON public.states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update addresses table to include country_id and state_id
ALTER TABLE public.addresses 
ADD COLUMN country_id uuid REFERENCES countries(id),
ADD COLUMN state_id uuid REFERENCES states(id),
ADD COLUMN area text;