-- Create media_library table for Backblaze B2 media management
CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('video', 'audio')),
  file_size BIGINT,
  mime_type TEXT,
  duration_seconds INTEGER,
  thumbnail_key TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_media_library_featured ON media_library(is_featured, is_active) WHERE is_featured = true AND is_active = true;
CREATE INDEX idx_media_library_active ON media_library(is_active, created_at DESC);

-- Enable RLS
ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;

-- Admin can manage all media
CREATE POLICY "Admin can manage all media" ON media_library
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'::user_role)
  );

-- Everyone can view active media
CREATE POLICY "Everyone can view active media" ON media_library
  FOR SELECT USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON media_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();