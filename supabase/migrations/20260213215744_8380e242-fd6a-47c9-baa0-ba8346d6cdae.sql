
-- Upload batches for tracking BOM imports
CREATE TABLE public.upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_batch_id UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on upload_batches" ON public.upload_batches FOR SELECT USING (true);
CREATE POLICY "Allow public insert on upload_batches" ON public.upload_batches FOR INSERT WITH CHECK (true);

-- BOM Lines (Page 1) - hierarchical bill of materials
CREATE TABLE public.bom_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_batch_id UUID NOT NULL,
  project_version_id UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bom_level INT NOT NULL DEFAULT 0,
  component_number TEXT NOT NULL,
  object_description TEXT,
  component_quantity NUMERIC NOT NULL DEFAULT 1,
  base_unit_measure TEXT DEFAULT 'EA',
  standard_price NUMERIC DEFAULT 0,
  material_type TEXT,
  item_text_line_2 TEXT,
  alt_item_group TEXT,
  usage_probability NUMERIC DEFAULT 100,
  sort_string TEXT,
  change_number TEXT,
  valid_from DATE,
  valid_to DATE,
  special_procurement_type TEXT,
  phantom BOOLEAN DEFAULT false,
  engineering_design TEXT,
  effective_out_date DATE,
  follow_up_material TEXT,
  component_unit TEXT DEFAULT 'EA',
  backflush BOOLEAN DEFAULT false,
  bulk_material BOOLEAN DEFAULT false,
  storage_location TEXT,
  explosive_level INT DEFAULT 0,
  relevancy_to_costing BOOLEAN DEFAULT true,
  supplier_sap TEXT,
  comp_tux_material_group TEXT,
  plant_sp_matl TEXT,
  item_number TEXT,
  item_category TEXT,
  required_qty NUMERIC NOT NULL DEFAULT 1,
  assembly_indicator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on bom_lines" ON public.bom_lines FOR SELECT USING (true);
CREATE POLICY "Allow public insert on bom_lines" ON public.bom_lines FOR INSERT WITH CHECK (true);

-- Supplier Data (Page 2)
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  lead_time_days INT DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  supplier_pn TEXT,
  alt_supplier_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on suppliers" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Allow public insert on suppliers" ON public.suppliers FOR INSERT WITH CHECK (true);

-- Inventory (Page 3)
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL,
  project_version_id UUID,
  on_hand_qty INT DEFAULT 0,
  on_order_qty INT DEFAULT 0,
  bin_location TEXT,
  last_counted_at TIMESTAMPTZ,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert on inventory" ON public.inventory FOR INSERT WITH CHECK (true);

-- =====================================================
-- NEW TABLES: Projects, Versions, Tasks, etc.
-- =====================================================

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  customer TEXT,
  start_date DATE,
  target_end_date DATE,
  project_lead TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert on projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on projects" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);

-- Project Versions
CREATE TABLE public.project_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on project_versions" ON public.project_versions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on project_versions" ON public.project_versions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on project_versions" ON public.project_versions FOR UPDATE USING (true) WITH CHECK (true);

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  task_name TEXT NOT NULL,
  phase TEXT,
  assigned_to TEXT,
  start_date DATE,
  due_date DATE,
  progress NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Not Started',
  blocked_reason TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on tasks" ON public.tasks FOR UPDATE USING (true) WITH CHECK (true);

-- Task Steps
CREATE TABLE public.task_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  weight NUMERIC NOT NULL DEFAULT 0.05,
  complete BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on task_steps" ON public.task_steps FOR SELECT USING (true);
CREATE POLICY "Allow public insert on task_steps" ON public.task_steps FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on task_steps" ON public.task_steps FOR UPDATE USING (true) WITH CHECK (true);

-- Part Requests
CREATE TABLE public.part_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  part_number TEXT NOT NULL,
  requested_qty INT NOT NULL DEFAULT 1,
  requested_by TEXT,
  request_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  needed_by_date DATE,
  urgency TEXT NOT NULL DEFAULT 'Standard',
  status TEXT NOT NULL DEFAULT 'Pending',
  approved_by TEXT,
  approval_date TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.part_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on part_requests" ON public.part_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert on part_requests" ON public.part_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on part_requests" ON public.part_requests FOR UPDATE USING (true) WITH CHECK (true);

-- Picking Orders
CREATE TABLE public.picking_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  work_order_number TEXT,
  part_number TEXT NOT NULL,
  pick_qty INT NOT NULL DEFAULT 1,
  bin_location TEXT,
  assigned_picker TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  picked_qty INT DEFAULT 0,
  picked_date_time TIMESTAMPTZ,
  verified_by TEXT,
  issue_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.picking_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on picking_orders" ON public.picking_orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert on picking_orders" ON public.picking_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on picking_orders" ON public.picking_orders FOR UPDATE USING (true) WITH CHECK (true);

-- Issues
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.project_versions(id) ON DELETE SET NULL,
  related_module TEXT,
  related_record_id UUID,
  issue_description TEXT NOT NULL,
  raised_by TEXT,
  raised_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_to TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  root_cause TEXT,
  resolution TEXT,
  resolved_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Allow public insert on issues" ON public.issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on issues" ON public.issues FOR UPDATE USING (true) WITH CHECK (true);
