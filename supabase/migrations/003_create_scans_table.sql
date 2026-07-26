-- Create scans table: stores Build Scanner reports per user, optionally
-- linked to a project.
CREATE TABLE scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'github' CHECK (source_type IN ('github', 'local', 'upload')),
  source_label TEXT NOT NULL,
  project_type TEXT,
  security_score INTEGER,
  security_grade TEXT,
  -- Full ScanReport JSON so the report can be re-rendered without re-scanning.
  report JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Scans policies
CREATE POLICY "Users can view their own scans" ON scans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans" ON scans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans" ON scans
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_project_id ON scans(project_id);
CREATE INDEX idx_scans_created_at ON scans(created_at DESC);
