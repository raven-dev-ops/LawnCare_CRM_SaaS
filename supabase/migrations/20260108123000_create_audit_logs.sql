-- Create audit_logs table for change tracking
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID DEFAULT auth.uid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated inserts (server actions)
CREATE POLICY "Enable insert for authenticated users" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow admin read access
CREATE POLICY "Enable read access for admins" ON audit_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Allow service role read access
CREATE POLICY "Enable read access for service role" ON audit_logs
  FOR SELECT
  USING (auth.role() = 'service_role');
