-- Fix RLS policies: allow public access for all tables (no auth required)

-- Projects
DROP POLICY IF EXISTS "Allow public read on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public update on projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
CREATE POLICY "Allow public read on projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert on projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);

-- Project Versions
DROP POLICY IF EXISTS "Allow public read on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Allow public insert on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Allow public update on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Users can view project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Users can insert project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Users can update project_versions" ON public.project_versions;
CREATE POLICY "Allow public read on project_versions" ON public.project_versions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on project_versions" ON public.project_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on project_versions" ON public.project_versions FOR UPDATE USING (true) WITH CHECK (true);

-- Tasks
DROP POLICY IF EXISTS "Allow public read on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public insert on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public update on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "Allow public read on tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);

-- Task Steps
DROP POLICY IF EXISTS "Allow public read on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Allow public insert on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Allow public update on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Users can view task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Users can insert task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Users can update task_steps" ON public.task_steps;
CREATE POLICY "Allow public read on task_steps" ON public.task_steps FOR SELECT USING (true);
CREATE POLICY "Allow public insert on task_steps" ON public.task_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on task_steps" ON public.task_steps FOR UPDATE USING (true) WITH CHECK (true);

-- Part Requests
DROP POLICY IF EXISTS "Allow public read on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Allow public insert on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Allow public update on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Users can view part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Users can insert part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Users can update part_requests" ON public.part_requests;
CREATE POLICY "Allow public read on part_requests" ON public.part_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert on part_requests" ON public.part_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on part_requests" ON public.part_requests FOR UPDATE USING (true) WITH CHECK (true);

-- Picking Orders
DROP POLICY IF EXISTS "Allow public read on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Allow public insert on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Allow public update on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Users can view picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Users can insert picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Users can update picking_orders" ON public.picking_orders;
CREATE POLICY "Allow public read on picking_orders" ON public.picking_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert on picking_orders" ON public.picking_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on picking_orders" ON public.picking_orders FOR UPDATE USING (true) WITH CHECK (true);

-- Issues
DROP POLICY IF EXISTS "Allow public read on issues" ON public.issues;
DROP POLICY IF EXISTS "Allow public insert on issues" ON public.issues;
DROP POLICY IF EXISTS "Allow public update on issues" ON public.issues;
DROP POLICY IF EXISTS "Users can view issues" ON public.issues;
DROP POLICY IF EXISTS "Users can insert issues" ON public.issues;
DROP POLICY IF EXISTS "Users can update issues" ON public.issues;
CREATE POLICY "Allow public read on issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert on issues" ON public.issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on issues" ON public.issues FOR UPDATE USING (true) WITH CHECK (true);

-- BOM Lines
DROP POLICY IF EXISTS "Allow public read on bom_lines" ON public.bom_lines;
DROP POLICY IF EXISTS "Allow public insert on bom_lines" ON public.bom_lines;
DROP POLICY IF EXISTS "Users can view bom_lines" ON public.bom_lines;
DROP POLICY IF EXISTS "Users can insert bom_lines" ON public.bom_lines;
CREATE POLICY "Allow public read on bom_lines" ON public.bom_lines FOR SELECT USING (true);
CREATE POLICY "Allow public insert on bom_lines" ON public.bom_lines FOR INSERT WITH CHECK (true);

-- Suppliers
DROP POLICY IF EXISTS "Allow public read on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public insert on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers" ON public.suppliers;
CREATE POLICY "Allow public read on suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);

-- Inventory
DROP POLICY IF EXISTS "Allow public read on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public insert on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can insert inventory" ON public.inventory;
CREATE POLICY "Allow public read on inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert on inventory" ON public.inventory FOR INSERT WITH CHECK (true);

-- Upload Batches
DROP POLICY IF EXISTS "Allow public read on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public insert on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Users can view upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Users can insert upload_batches" ON public.upload_batches;
CREATE POLICY "Allow public read on upload_batches" ON public.upload_batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert on upload_batches" ON public.upload_batches FOR INSERT WITH CHECK (true);
