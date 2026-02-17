-- Stock Issues table for Out of Stock tracking
CREATE TABLE stock_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  version_id UUID REFERENCES project_versions(id),
  work_order_number TEXT,
  part_number TEXT NOT NULL,
  part_description TEXT,
  quantity_short NUMERIC NOT NULL DEFAULT 0,
  reported_by TEXT,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE stock_issues ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read stock issues
CREATE POLICY "Authenticated users can view stock_issues"
  ON stock_issues FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert stock issues
CREATE POLICY "Authenticated users can insert stock_issues"
  ON stock_issues FOR INSERT TO authenticated WITH CHECK (true);
