-- Create customer_notes table for CRM communication log
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'note' CHECK (channel IN ('note', 'call', 'email', 'sms', 'in_person', 'other')),
  message TEXT NOT NULL,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_customer_notes_customer_id ON customer_notes(customer_id);
CREATE INDEX idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage notes
CREATE POLICY "Enable all operations for authenticated users" ON customer_notes
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow service role read access
CREATE POLICY "Enable read access for service role" ON customer_notes
  FOR SELECT
  USING (true);
