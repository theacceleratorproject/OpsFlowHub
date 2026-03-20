-- ============================================================================
-- Migration: Role-Based Access Control (RBAC) via profiles table
-- Adds user_role enum, profiles table with auto-creation trigger,
-- RLS policies, and a helper function for role lookups.
-- ============================================================================

-- ── ENUM ──────────────────────────────────────────────────────────────────────

CREATE TYPE public.user_role AS ENUM (
  'admin',
  'ops_manager',
  'npi_engineer',
  'planner',
  'quality_engineer',
  'executive'
);

-- ── Profiles table ────────────────────────────────────────────────────────────

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  full_name  TEXT,
  role       public.user_role NOT NULL DEFAULT 'npi_engineer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── Auto-create profile on signup ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'npi_engineer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Auto-update updated_at on profile change ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profiles_updated_at();

-- ── Helper: get current user's role ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

-- Any authenticated user can read their own profile
CREATE POLICY "Users can select own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all profiles (for user management UI)
CREATE POLICY "Admins can select all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.get_my_role() = 'admin');

-- Users can update their own full_name (but not role)
CREATE POLICY "Users can update own full_name"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Admins can update any profile's role
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── Seed: backfill profiles for existing users ───────────────────────────────

INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'npi_engineer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Promote the first registered user to admin
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
);
