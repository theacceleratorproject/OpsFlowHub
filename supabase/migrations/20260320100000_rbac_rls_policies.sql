-- ============================================================================
-- Migration: Role-aware RLS policies (defense-in-depth)
--
-- Adds RESTRICTIVE policies that enforce role-based write access.
-- These layer ON TOP of the existing permissive auth.uid() policies:
--
--   Permissive (existing) : at least ONE must pass  (ownership / auth check)
--   Restrictive (this file): ALL must pass           (role check)
--
-- Result: for every write, BOTH the ownership check AND the role check must
-- succeed. SELECT policies are untouched — every authenticated user can read.
--
-- Uses get_my_role() SECURITY DEFINER helper from 20260320000000_rbac_profiles.
-- A NULL return (no profile row) is treated as "no write access".
-- ============================================================================

-- ── Performance: mark get_my_role() as STABLE ───────────────────────────────
-- The function reads from a table and is deterministic within a single
-- statement. STABLE lets PostgreSQL cache the result across multiple policy
-- evaluations in the same query — critical now that every write hits ≥2
-- restrictive policy calls.

ALTER FUNCTION public.get_my_role() STABLE;

-- ════════════════════════════════════════════════════════════════════════════
-- 1) ecn_notices
--    INSERT : npi_engineer, quality_engineer, ops_manager, admin
--    UPDATE : quality_engineer, ops_manager, admin
--    DELETE : admin only
-- ════════════════════════════════════════════════════════════════════════════

CREATE POLICY "rbac insert ecn_notices"
  ON public.ecn_notices
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('npi_engineer', 'quality_engineer', 'ops_manager', 'admin')
  );

CREATE POLICY "rbac update ecn_notices"
  ON public.ecn_notices
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING  (public.get_my_role() IN ('quality_engineer', 'ops_manager', 'admin'))
  WITH CHECK (public.get_my_role() IN ('quality_engineer', 'ops_manager', 'admin'));

CREATE POLICY "rbac delete ecn_notices"
  ON public.ecn_notices
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

-- ════════════════════════════════════════════════════════════════════════════
-- 2) gate_reviews
--    INSERT / DELETE : ops_manager, admin
--    UPDATE          : quality_engineer, ops_manager, admin
-- ════════════════════════════════════════════════════════════════════════════

CREATE POLICY "rbac insert gate_reviews"
  ON public.gate_reviews
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('ops_manager', 'admin'));

CREATE POLICY "rbac update gate_reviews"
  ON public.gate_reviews
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING  (public.get_my_role() IN ('quality_engineer', 'ops_manager', 'admin'))
  WITH CHECK (public.get_my_role() IN ('quality_engineer', 'ops_manager', 'admin'));

CREATE POLICY "rbac delete gate_reviews"
  ON public.gate_reviews
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('ops_manager', 'admin'));

-- ════════════════════════════════════════════════════════════════════════════
-- 3) gate_criteria  (same role rules as gate_reviews)
-- ════════════════════════════════════════════════════════════════════════════

CREATE POLICY "rbac insert gate_criteria"
  ON public.gate_criteria
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('ops_manager', 'admin'));

CREATE POLICY "rbac update gate_criteria"
  ON public.gate_criteria
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING  (public.get_my_role() IN ('quality_engineer', 'ops_manager', 'admin'))
  WITH CHECK (public.get_my_role() IN ('quality_engineer', 'ops_manager', 'admin'));

CREATE POLICY "rbac delete gate_criteria"
  ON public.gate_criteria
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('ops_manager', 'admin'));

-- ════════════════════════════════════════════════════════════════════════════
-- 4) bom_lines
--    INSERT / UPDATE / DELETE : npi_engineer, ops_manager, admin
-- ════════════════════════════════════════════════════════════════════════════

CREATE POLICY "rbac insert bom_lines"
  ON public.bom_lines
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('npi_engineer', 'ops_manager', 'admin'));

CREATE POLICY "rbac update bom_lines"
  ON public.bom_lines
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING  (public.get_my_role() IN ('npi_engineer', 'ops_manager', 'admin'))
  WITH CHECK (public.get_my_role() IN ('npi_engineer', 'ops_manager', 'admin'));

CREATE POLICY "rbac delete bom_lines"
  ON public.bom_lines
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.get_my_role() IN ('npi_engineer', 'ops_manager', 'admin'));

-- ════════════════════════════════════════════════════════════════════════════
-- 5) profiles
--    Allow ops_manager to SELECT all rows (admin already can).
--    UPDATE restrictions already handled by existing policies:
--      - Users can update own full_name (role column frozen)
--      - Admins can update any profile (including role)
-- ════════════════════════════════════════════════════════════════════════════

CREATE POLICY "Ops managers can select all profiles"
  ON public.profiles
  FOR SELECT TO authenticated
  USING (public.get_my_role() = 'ops_manager');

-- ════════════════════════════════════════════════════════════════════════════
-- 6) Executive write-block on all remaining data tables
--    Executives get SELECT only — all INSERT/UPDATE/DELETE blocked.
--
--    Note: get_my_role() returning NULL (no profile) also evaluates to false,
--    so users without a profile row are blocked from writes too.
--
--    Tables: projects, project_versions, tasks, task_steps, inventory,
--            suppliers, part_requests, picking_orders, issues,
--            work_orders, work_order_lines, upload_batches
-- ════════════════════════════════════════════════════════════════════════════

-- projects
CREATE POLICY "rbac insert projects"
  ON public.projects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update projects"
  ON public.projects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete projects"
  ON public.projects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- project_versions
CREATE POLICY "rbac insert project_versions"
  ON public.project_versions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update project_versions"
  ON public.project_versions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete project_versions"
  ON public.project_versions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- tasks
CREATE POLICY "rbac insert tasks"
  ON public.tasks AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update tasks"
  ON public.tasks AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete tasks"
  ON public.tasks AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- task_steps
CREATE POLICY "rbac insert task_steps"
  ON public.task_steps AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update task_steps"
  ON public.task_steps AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete task_steps"
  ON public.task_steps AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- inventory
CREATE POLICY "rbac insert inventory"
  ON public.inventory AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update inventory"
  ON public.inventory AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete inventory"
  ON public.inventory AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- suppliers
CREATE POLICY "rbac insert suppliers"
  ON public.suppliers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update suppliers"
  ON public.suppliers AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete suppliers"
  ON public.suppliers AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- part_requests
CREATE POLICY "rbac insert part_requests"
  ON public.part_requests AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update part_requests"
  ON public.part_requests AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete part_requests"
  ON public.part_requests AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- picking_orders
CREATE POLICY "rbac insert picking_orders"
  ON public.picking_orders AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update picking_orders"
  ON public.picking_orders AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete picking_orders"
  ON public.picking_orders AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- issues
CREATE POLICY "rbac insert issues"
  ON public.issues AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update issues"
  ON public.issues AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete issues"
  ON public.issues AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- work_orders
CREATE POLICY "rbac insert work_orders"
  ON public.work_orders AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update work_orders"
  ON public.work_orders AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete work_orders"
  ON public.work_orders AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- work_order_lines
CREATE POLICY "rbac insert work_order_lines"
  ON public.work_order_lines AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update work_order_lines"
  ON public.work_order_lines AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete work_order_lines"
  ON public.work_order_lines AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');

-- upload_batches
CREATE POLICY "rbac insert upload_batches"
  ON public.upload_batches AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac update upload_batches"
  ON public.upload_batches AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.get_my_role() != 'executive')
  WITH CHECK (public.get_my_role() != 'executive');
CREATE POLICY "rbac delete upload_batches"
  ON public.upload_batches AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.get_my_role() != 'executive');
