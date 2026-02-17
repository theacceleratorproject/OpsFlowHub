-- =====================================================
-- Phase 1: Profiles table + updated RLS
-- =====================================================

-- 1.1 Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: all authenticated can read, users can update own
CREATE POLICY "Authenticated users can read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile on signup
-- First signup becomes admin, subsequent signups become member
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role TEXT;
BEGIN
  IF (SELECT count(*) FROM public.profiles) = 0 THEN
    _role := 'admin';
  ELSE
    _role := 'member';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    _role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow the trigger to insert into profiles
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 1.2 Drop all old "Allow public" policies, replace with auth-based
-- =====================================================

-- Helper: check role from profiles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ---- upload_batches (open to authenticated for BOM import flow) ----
DROP POLICY IF EXISTS "Allow public read on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public insert on upload_batches" ON public.upload_batches;
CREATE POLICY "Authenticated read upload_batches" ON public.upload_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert upload_batches" ON public.upload_batches FOR INSERT TO authenticated WITH CHECK (true);

-- ---- bom_lines (open to authenticated for BOM import flow) ----
DROP POLICY IF EXISTS "Allow public read on bom_lines" ON public.bom_lines;
DROP POLICY IF EXISTS "Allow public insert on bom_lines" ON public.bom_lines;
CREATE POLICY "Authenticated read bom_lines" ON public.bom_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert bom_lines" ON public.bom_lines FOR INSERT TO authenticated WITH CHECK (true);

-- ---- suppliers (open to authenticated) ----
DROP POLICY IF EXISTS "Allow public read on suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow public insert on suppliers" ON public.suppliers;
CREATE POLICY "Authenticated read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);

-- ---- inventory (open to authenticated) ----
DROP POLICY IF EXISTS "Allow public read on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public insert on inventory" ON public.inventory;
CREATE POLICY "Authenticated read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (true);

-- ---- projects ----
DROP POLICY IF EXISTS "Allow public read on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public insert on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow public update on projects" ON public.projects;
CREATE POLICY "Authenticated read projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "Admin/member update projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'member'))
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));

-- ---- project_versions ----
DROP POLICY IF EXISTS "Allow public read on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Allow public insert on project_versions" ON public.project_versions;
DROP POLICY IF EXISTS "Allow public update on project_versions" ON public.project_versions;
CREATE POLICY "Authenticated read project_versions" ON public.project_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert project_versions" ON public.project_versions FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "Admin/member update project_versions" ON public.project_versions FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'member'))
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));

-- ---- tasks ----
DROP POLICY IF EXISTS "Allow public read on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public insert on tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public update on tasks" ON public.tasks;
CREATE POLICY "Authenticated read tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "Admin/member update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'member'))
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));

-- ---- task_steps ----
DROP POLICY IF EXISTS "Allow public read on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Allow public insert on task_steps" ON public.task_steps;
DROP POLICY IF EXISTS "Allow public update on task_steps" ON public.task_steps;
CREATE POLICY "Authenticated read task_steps" ON public.task_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert task_steps" ON public.task_steps FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "Admin/member update task_steps" ON public.task_steps FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'member'))
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));

-- ---- part_requests ----
DROP POLICY IF EXISTS "Allow public read on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Allow public insert on part_requests" ON public.part_requests;
DROP POLICY IF EXISTS "Allow public update on part_requests" ON public.part_requests;
CREATE POLICY "Authenticated read part_requests" ON public.part_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/member insert part_requests" ON public.part_requests FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));
CREATE POLICY "Admin/member update part_requests" ON public.part_requests FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'member'))
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));

-- ---- picking_orders ----
DROP POLICY IF EXISTS "Allow public read on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Allow public insert on picking_orders" ON public.picking_orders;
DROP POLICY IF EXISTS "Allow public update on picking_orders" ON public.picking_orders;
CREATE POLICY "Authenticated read picking_orders" ON public.picking_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert picking_orders" ON public.picking_orders FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "Admin/member update picking_orders" ON public.picking_orders FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'member'))
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));

-- ---- issues ----
DROP POLICY IF EXISTS "Allow public read on issues" ON public.issues;
DROP POLICY IF EXISTS "Allow public insert on issues" ON public.issues;
DROP POLICY IF EXISTS "Allow public update on issues" ON public.issues;
CREATE POLICY "Authenticated read issues" ON public.issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/member insert issues" ON public.issues FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));
CREATE POLICY "Admin/member update issues" ON public.issues FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'member'))
  WITH CHECK (public.get_my_role() IN ('admin', 'member'));
