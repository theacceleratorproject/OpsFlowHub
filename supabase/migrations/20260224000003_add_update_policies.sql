-- Add missing UPDATE policies for bom_lines, suppliers, inventory, upload_batches

CREATE POLICY "Allow public update on bom_lines" ON public.bom_lines FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update on suppliers" ON public.suppliers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update on inventory" ON public.inventory FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public update on upload_batches" ON public.upload_batches FOR UPDATE USING (true) WITH CHECK (true);
