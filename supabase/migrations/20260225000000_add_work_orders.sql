-- Work Orders
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  work_order_number TEXT NOT NULL,
  bom_header_id UUID REFERENCES public.bom_lines(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'Open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on work_orders" ON public.work_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert on work_orders" ON public.work_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on work_orders" ON public.work_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on work_orders" ON public.work_orders FOR DELETE USING (true);

CREATE INDEX idx_work_orders_version ON public.work_orders(version_id);
CREATE INDEX idx_work_orders_wo_number ON public.work_orders(work_order_number);

-- Work Order Lines
CREATE TABLE public.work_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  description TEXT,
  required_qty NUMERIC NOT NULL DEFAULT 1,
  unit_of_measure TEXT DEFAULT 'EA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on work_order_lines" ON public.work_order_lines FOR SELECT USING (true);
CREATE POLICY "Allow public insert on work_order_lines" ON public.work_order_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on work_order_lines" ON public.work_order_lines FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on work_order_lines" ON public.work_order_lines FOR DELETE USING (true);

CREATE INDEX idx_work_order_lines_wo ON public.work_order_lines(work_order_id);
