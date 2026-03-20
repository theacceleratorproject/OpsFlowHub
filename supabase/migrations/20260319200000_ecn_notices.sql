-- ============================================================================
-- Migration: ECN (Engineering Change Notice) table
-- Tracks formal change notices against BOM/design through the NPI lifecycle
-- ============================================================================

-- ── ENUMs ───────────────────────────────────────────────────────────────────

CREATE TYPE public.ecn_status AS ENUM ('draft', 'under_review', 'approved', 'implemented', 'rejected');
CREATE TYPE public.ecn_priority AS ENUM ('critical', 'high', 'normal');

-- ── ECN Notices ─────────────────────────────────────────────────────────────

CREATE TABLE public.ecn_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ecn_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status public.ecn_status NOT NULL DEFAULT 'draft',
  priority public.ecn_priority NOT NULL DEFAULT 'normal',
  project_version_id UUID NOT NULL REFERENCES public.project_versions(id) ON DELETE CASCADE,
  submitted_by TEXT,
  approved_by TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  implementation_date DATE,
  affected_bom_lines TEXT[] DEFAULT '{}',
  reason TEXT,
  impact_summary TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ecn_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select on ecn_notices" ON public.ecn_notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on ecn_notices" ON public.ecn_notices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on ecn_notices" ON public.ecn_notices FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on ecn_notices" ON public.ecn_notices FOR DELETE TO authenticated USING (created_by = auth.uid());

CREATE INDEX idx_ecn_notices_version ON public.ecn_notices(project_version_id);
CREATE INDEX idx_ecn_notices_status ON public.ecn_notices(status);
CREATE INDEX idx_ecn_notices_ecn_number ON public.ecn_notices(ecn_number);
