import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// ── Row type exports ──────────────────────────────────────────────
export type BomLineRow = Tables<'bom_lines'>;
export type SupplierRow = Tables<'suppliers'>;
export type InventoryRow = Tables<'inventory'>;
export type ProjectRow = Tables<'projects'>;
export type ProjectVersionRow = Tables<'project_versions'>;
export type TaskRow = Tables<'tasks'>;
export type TaskStepRow = Tables<'task_steps'>;
export type PartRequestRow = Tables<'part_requests'>;
export type PickingOrderRow = Tables<'picking_orders'>;
export type IssueRow = Tables<'issues'>;

// ── Existing hooks (BOM / Suppliers / Inventory) ──────────────────

export const useBomLines = (projectVersionId?: string) =>
  useQuery({
    queryKey: ['bom_lines', projectVersionId],
    queryFn: async () => {
      let query = supabase
        .from('bom_lines')
        .select('*')
        .order('sort_string', { ascending: true });
      if (projectVersionId) {
        query = query.eq('project_version_id', projectVersionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as BomLineRow[];
    },
  });

export const useSuppliers = () =>
  useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*');
      if (error) throw error;
      return data as SupplierRow[];
    },
  });

export const useInventory = (projectVersionId?: string) =>
  useQuery({
    queryKey: ['inventory', projectVersionId],
    queryFn: async () => {
      let query = supabase.from('inventory').select('*');
      if (projectVersionId) {
        query = query.eq('project_version_id', projectVersionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryRow[];
    },
  });

// ── Projects ──────────────────────────────────────────────────────

export const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProjectRow[];
    },
  });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: TablesInsert<'projects'>) => {
      const { data, error } = await supabase.from('projects').insert(project).select().single();
      if (error) throw error;
      return data as ProjectRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useUpdateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'projects'> & { id: string }) => {
      const { data, error } = await supabase.from('projects').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as ProjectRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

// ── Project Versions ──────────────────────────────────────────────

export const useProjectVersions = (projectId?: string) =>
  useQuery({
    queryKey: ['project_versions', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_versions')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ProjectVersionRow[];
    },
  });

export const useCreateProjectVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (version: TablesInsert<'project_versions'>) => {
      const { data, error } = await supabase.from('project_versions').insert(version).select().single();
      if (error) throw error;
      return data as ProjectVersionRow;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['project_versions', variables.project_id] });
    },
  });
};

// ── Tasks ─────────────────────────────────────────────────────────

export const useTasks = (versionId?: string) =>
  useQuery({
    queryKey: ['tasks', versionId],
    enabled: !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('version_id', versionId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TaskRow[];
    },
  });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: TablesInsert<'tasks'>) => {
      const { data, error } = await supabase.from('tasks').insert(task).select().single();
      if (error) throw error;
      return data as TaskRow;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['tasks', variables.version_id] });
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'tasks'> & { id: string }) => {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as TaskRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', data.version_id] });
    },
  });
};

// ── Task Steps ────────────────────────────────────────────────────

export const useTaskSteps = (taskId?: string) =>
  useQuery({
    queryKey: ['task_steps', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_steps')
        .select('*')
        .eq('task_id', taskId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as TaskStepRow[];
    },
  });

export const useCreateTaskSteps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (steps: TablesInsert<'task_steps'>[]) => {
      const { data, error } = await supabase.from('task_steps').insert(steps).select();
      if (error) throw error;
      return data as TaskStepRow[];
    },
    onSuccess: (_data, variables) => {
      if (variables.length > 0) {
        qc.invalidateQueries({ queryKey: ['task_steps', variables[0].task_id] });
      }
    },
  });
};

export const useUpdateTaskStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'task_steps'> & { id: string }) => {
      const { data, error } = await supabase.from('task_steps').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as TaskStepRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['task_steps', data.task_id] });
    },
  });
};

// ── Part Requests ─────────────────────────────────────────────────

export const usePartRequests = (versionId?: string) =>
  useQuery({
    queryKey: ['part_requests', versionId],
    enabled: !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_requests')
        .select('*')
        .eq('version_id', versionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PartRequestRow[];
    },
  });

export const useCreatePartRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: TablesInsert<'part_requests'>) => {
      const { data, error } = await supabase.from('part_requests').insert(req).select().single();
      if (error) throw error;
      return data as PartRequestRow;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['part_requests', variables.version_id] });
    },
  });
};

export const useUpdatePartRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'part_requests'> & { id: string }) => {
      const { data, error } = await supabase.from('part_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as PartRequestRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['part_requests', data.version_id] });
    },
  });
};

// ── Picking Orders ────────────────────────────────────────────────

export const usePickingOrders = (versionId?: string) =>
  useQuery({
    queryKey: ['picking_orders', versionId],
    enabled: !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('picking_orders')
        .select('*')
        .eq('version_id', versionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PickingOrderRow[];
    },
  });

export const useCreatePickingOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: TablesInsert<'picking_orders'>) => {
      const { data, error } = await supabase.from('picking_orders').insert(order).select().single();
      if (error) throw error;
      return data as PickingOrderRow;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['picking_orders', variables.version_id] });
    },
  });
};

export const useUpdatePickingOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'picking_orders'> & { id: string }) => {
      const { data, error } = await supabase.from('picking_orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as PickingOrderRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['picking_orders', data.version_id] });
    },
  });
};

// ── Issues ────────────────────────────────────────────────────────

export const useIssues = (versionId?: string) =>
  useQuery({
    queryKey: ['issues', versionId],
    enabled: !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('version_id', versionId!)
        .order('raised_date', { ascending: false });
      if (error) throw error;
      return data as IssueRow[];
    },
  });

export const useCreateIssue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (issue: TablesInsert<'issues'>) => {
      const { data, error } = await supabase.from('issues').insert(issue).select().single();
      if (error) throw error;
      return data as IssueRow;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['issues', variables.version_id] });
    },
  });
};

export const useUpdateIssue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'issues'> & { id: string }) => {
      const { data, error } = await supabase.from('issues').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as IssueRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['issues', data.version_id] });
    },
  });
};
