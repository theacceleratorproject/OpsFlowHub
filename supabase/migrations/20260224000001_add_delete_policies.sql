-- Add DELETE policies for all tables

CREATE POLICY "Allow public delete on task_steps" ON public.task_steps FOR DELETE USING (true);
CREATE POLICY "Allow public delete on tasks" ON public.tasks FOR DELETE USING (true);
CREATE POLICY "Allow public delete on projects" ON public.projects FOR DELETE USING (true);
CREATE POLICY "Allow public delete on project_versions" ON public.project_versions FOR DELETE USING (true);
CREATE POLICY "Allow public delete on part_requests" ON public.part_requests FOR DELETE USING (true);
CREATE POLICY "Allow public delete on picking_orders" ON public.picking_orders FOR DELETE USING (true);
CREATE POLICY "Allow public delete on issues" ON public.issues FOR DELETE USING (true);
CREATE POLICY "Allow public delete on bom_lines" ON public.bom_lines FOR DELETE USING (true);
CREATE POLICY "Allow public delete on suppliers" ON public.suppliers FOR DELETE USING (true);
CREATE POLICY "Allow public delete on inventory" ON public.inventory FOR DELETE USING (true);
CREATE POLICY "Allow public delete on upload_batches" ON public.upload_batches FOR DELETE USING (true);
