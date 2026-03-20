-- ============================================================================
-- Migration: Add missing FK constraints and additional indexes
-- ============================================================================

-- Foreign key constraints for bom_lines and inventory → project_versions
ALTER TABLE public.bom_lines
  ADD CONSTRAINT bom_lines_project_version_id_fkey
  FOREIGN KEY (project_version_id) REFERENCES public.project_versions(id) ON DELETE CASCADE;

ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_project_version_id_fkey
  FOREIGN KEY (project_version_id) REFERENCES public.project_versions(id) ON DELETE CASCADE;

-- Additional indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_suppliers_part_number ON public.suppliers(part_number);
CREATE INDEX IF NOT EXISTS idx_picking_orders_work_order_number ON public.picking_orders(work_order_number);
