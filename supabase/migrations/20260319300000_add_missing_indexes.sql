-- ============================================================================
-- Migration: Add missing indexes on frequently queried foreign key columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_version ON public.tasks(version_id);
CREATE INDEX IF NOT EXISTS idx_part_requests_version ON public.part_requests(version_id);
CREATE INDEX IF NOT EXISTS idx_picking_orders_version ON public.picking_orders(version_id);
CREATE INDEX IF NOT EXISTS idx_issues_version ON public.issues(version_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_version ON public.bom_lines(project_version_id);
CREATE INDEX IF NOT EXISTS idx_inventory_version ON public.inventory(project_version_id);
CREATE INDEX IF NOT EXISTS idx_gate_criteria_review ON public.gate_criteria(gate_review_id);
