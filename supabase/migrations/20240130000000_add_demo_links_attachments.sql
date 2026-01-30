-- Add demo_links array to opportunities table
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS demo_links TEXT[] DEFAULT '{}';

-- Create attachments table for file references
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id)
);

-- Index for fast lookups by opportunity
CREATE INDEX IF NOT EXISTS idx_attachments_opportunity ON attachments(opportunity_id);

-- Enable Row Level Security
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- RLS policy: Authenticated users can manage all attachments
CREATE POLICY "Authenticated users can manage attachments" ON attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create storage bucket for attachments (run this in Supabase Dashboard SQL editor if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);
