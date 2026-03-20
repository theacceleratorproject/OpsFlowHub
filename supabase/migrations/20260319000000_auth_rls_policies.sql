-- ============================================================================
-- Migration: Replace public RLS policies with auth.uid()-based policies
-- Adds created_by column to all 13 tables, drops all permissive policies,
-- and creates proper auth-based policies.
-- ============================================================================

-- ── Step 1: Add created_by column to all tables ──────────────────────────────
-- Default to auth.uid() so new rows automatically track who created them.
-- Existing rows get NULL (no retroactive ownership).

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.project_versions ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.task_steps ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.bom_lines ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.part_requests ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.picking_orders ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.work_order_lines ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS created_by UUID DEFAULT auth.uid();

-- ── Step 2: Drop all existing permissive public policies ─────────────────────

-- projects
DROP POLICY IF EXISTS "Allow public read on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public update on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public delete on projects" ON public.projects;

-- project_versions
DROP POLICY IF EXISTS "Allow public read on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Allow public insert on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Allow public update on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Allow public delete on project_versions" ON public.project_versions;

-- tasks
DROP POLICY IF EXISTS "Allow public read on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public insert on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public update on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public delete on tasks" ON public.tasks;

-- task_steps
DROP POLICY IF EXISTS "Allow public read on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Allow public insert on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Allow public update on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Allow public delete on task_steps" ON public.task_steps;

-- bom_lines
DROP POLICY IF EXISTS "Allow public read on bom_lines" ON public.bom_lines;
DROP POLICY IF EXISTS "Allow public insert on bom_lines" ON public.bom_lines;
DROP POLICY IF EXISTS "Allow public update on bom_lines" ON public.bom_lines;
DROP POLICY IF EXISTS "Allow public delete on bom_lines" ON public.bom_lines;

-- inventory
DROP POLICY IF EXISTS "Allow public read on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public insert on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public update on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public delete on inventory" ON public.inventory;

-- suppliers
DROP POLICY IF EXISTS "Allow public read on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public insert on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public update on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public delete on suppliers" ON public.suppliers;

-- part_requests
DROP POLICY IF EXISTS "Allow public read on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Allow public insert on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Allow public update on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Allow public delete on part_requests" ON public.part_requests;

-- picking_orders
DROP POLICY IF EXISTS "Allow public read on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Allow public insert on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Allow public update on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Allow public delete on picking_orders" ON public.picking_orders;

-- issues
DROP POLICY IF EXISTS "Allow public read on issues" ON public.issues;
DROP POLICY IF EXISTS "Allow public insert on issues" ON public.issues;
DROP POLICY IF EXISTS "Allow public update on issues" ON public.issues;
DROP POLICY IF EXISTS "Allow public delete on issues" ON public.issues;

-- work_orders
DROP POLICY IF EXISTS "Allow public select on work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Allow public insert on work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Allow public update on work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Allow public delete on work_orders" ON public.work_orders;

-- work_order_lines
DROP POLICY IF EXISTS "Allow public select on work_order_lines" ON public.work_order_lines;
DROP POLICY IF EXISTS "Allow public insert on work_order_lines" ON public.work_order_lines;
DROP POLICY IF EXISTS "Allow public update on work_order_lines" ON public.work_order_lines;
DROP POLICY IF EXISTS "Allow public delete on work_order_lines" ON public.work_order_lines;

-- upload_batches
DROP POLICY IF EXISTS "Allow public read on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public insert on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public update on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public delete on upload_batches" ON public.upload_batches;

-- ── Step 3: Create auth-based policies ───────────────────────────────────────
-- SELECT: any authenticated user can read all rows
-- INSERT: any authenticated user can insert (created_by auto-set via DEFAULT)
-- UPDATE: only the row creator can update
-- DELETE: only the row creator can delete

-- projects
CREATE POLICY "Authenticated select on projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on projects" ON public.projects FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on projects" ON public.projects FOR DELETE TO authenticated USING (created_by = auth.uid());

-- project_versions
CREATE POLICY "Authenticated select on project_versions" ON public.project_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on project_versions" ON public.project_versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on project_versions" ON public.project_versions FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on project_versions" ON public.project_versions FOR DELETE TO authenticated USING (created_by = auth.uid());

-- tasks
CREATE POLICY "Authenticated select on tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on tasks" ON public.tasks FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on tasks" ON public.tasks FOR DELETE TO authenticated USING (created_by = auth.uid());

-- task_steps
CREATE POLICY "Authenticated select on task_steps" ON public.task_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on task_steps" ON public.task_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on task_steps" ON public.task_steps FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on task_steps" ON public.task_steps FOR DELETE TO authenticated USING (created_by = auth.uid());

-- bom_lines
CREATE POLICY "Authenticated select on bom_lines" ON public.bom_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on bom_lines" ON public.bom_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on bom_lines" ON public.bom_lines FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on bom_lines" ON public.bom_lines FOR DELETE TO authenticated USING (created_by = auth.uid());

-- inventory
CREATE POLICY "Authenticated select on inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on inventory" ON public.inventory FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on inventory" ON public.inventory FOR DELETE TO authenticated USING (created_by = auth.uid());

-- suppliers
CREATE POLICY "Authenticated select on suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on suppliers" ON public.suppliers FOR DELETE TO authenticated USING (created_by = auth.uid());

-- part_requests
CREATE POLICY "Authenticated select on part_requests" ON public.part_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on part_requests" ON public.part_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on part_requests" ON public.part_requests FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on part_requests" ON public.part_requests FOR DELETE TO authenticated USING (created_by = auth.uid());

-- picking_orders
CREATE POLICY "Authenticated select on picking_orders" ON public.picking_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on picking_orders" ON public.picking_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on picking_orders" ON public.picking_orders FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on picking_orders" ON public.picking_orders FOR DELETE TO authenticated USING (created_by = auth.uid());

-- issues
CREATE POLICY "Authenticated select on issues" ON public.issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on issues" ON public.issues FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on issues" ON public.issues FOR DELETE TO authenticated USING (created_by = auth.uid());

-- work_orders
CREATE POLICY "Authenticated select on work_orders" ON public.work_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on work_orders" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on work_orders" ON public.work_orders FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on work_orders" ON public.work_orders FOR DELETE TO authenticated USING (created_by = auth.uid());

-- work_order_lines
CREATE POLICY "Authenticated select on work_order_lines" ON public.work_order_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on work_order_lines" ON public.work_order_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on work_order_lines" ON public.work_order_lines FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on work_order_lines" ON public.work_order_lines FOR DELETE TO authenticated USING (created_by = auth.uid());

-- upload_batches
CREATE POLICY "Authenticated select on upload_batches" ON public.upload_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert on upload_batches" ON public.upload_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owner update on upload_batches" ON public.upload_batches FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Owner delete on upload_batches" ON public.upload_batches FOR DELETE TO authenticated USING (created_by = auth.uid());
