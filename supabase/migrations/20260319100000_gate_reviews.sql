-- ============================================================================
-- Migration: Gate Reviews & Gate Criteria tables
-- Tracks phase-gate readiness reviews (Proto → EVT → DVT → PVT → MP)
-- ============================================================================

-- ── ENUMs ───────────────────────────────────────────────────────────────────

CREATE TYPE public.gate_name AS ENUM ('Proto', 'EVT', 'DVT', 'PVT', 'MP');
CREATE TYPE public.gate_status AS ENUM ('completed', 'in_progress', 'planned');

-- ── Gate Reviews ────────────────────────────────────────────────────────────

CREATE TABLE public.gate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_version_id UUID NOT NULL REFERENCES public.project_versions(id) ON DELETE CASCADE,
  gate_name public.gate_name NOT NULL,
  status public.gate_status NOT NULL DEFAULT 'planned',
  target_date DATE,
  actual_date DATE,
  readiness_score INTEGER CHECK (readiness_score >= 0 AND readiness_score <= 100),
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gate_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select on gate_reviews" ON public.gate_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on gate_reviews" ON public.gate_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on gate_reviews" ON public.gate_reviews FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on gate_reviews" ON public.gate_reviews FOR DELETE TO authenticated USING (created_by = auth.uid());

-- ── Gate Criteria ───────────────────────────────────────────────────────────

CREATE TABLE public.gate_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_review_id UUID NOT NULL REFERENCES public.gate_reviews(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  criterion TEXT NOT NULL,
  is_met BOOLEAN NOT NULL DEFAULT false,
  owner TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gate_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated select on gate_criteria" ON public.gate_criteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on gate_criteria" ON public.gate_criteria FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on gate_criteria" ON public.gate_criteria FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on gate_criteria" ON public.gate_criteria FOR DELETE TO authenticated USING (created_by = auth.uid());
