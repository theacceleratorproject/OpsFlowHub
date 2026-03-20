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
export type WorkOrderRow = Tables<'work_orders'>;
export type WorkOrderLineRow = Tables<'work_order_lines'>;
export type GateReviewRow = Tables<'gate_reviews'>;
export type GateCriterionRow = Tables<'gate_criteria'>;
export type EcnNoticeRow = Tables<'ecn_notices'>;

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

export const useUpdateBomLine = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TablesUpdate<'bom_lines'>>) => {
      const { data, error } = await supabase.from('bom_lines').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as BomLineRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bom_lines', data.project_version_id] });
    },
  });
};

export const useUploadBomLines = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lines, versionId }: { lines: TablesInsert<'bom_lines'>[]; versionId: string }) => {
      const batchSize = 500;
      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        const { error } = await supabase.from('bom_lines').insert(batch);
        if (error) throw error;
      }
      return lines.length;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['bom_lines', variables.versionId] });
    },
  });
};

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

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, version_id }: { id: string; version_id: string }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return { id, version_id };
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

export const useUpdateTaskSteps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; weight: number }[]) => {
      const results = await Promise.all(
        updates.map(({ id, weight }) =>
          supabase.from('task_steps').update({ weight }).eq('id', id).select().single()
        )
      );
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
      return results.map(r => r.data as TaskStepRow);
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        qc.invalidateQueries({ queryKey: ['task_steps', data[0].task_id] });
      }
    },
  });
};

export const useReorderTaskSteps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sort_order: number; task_id: string }[]) => {
      const results = await Promise.all(
        updates.map(({ id, sort_order }) =>
          supabase.from('task_steps').update({ sort_order }).eq('id', id).select().single()
        )
      );
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
      return updates[0]?.task_id;
    },
    onSuccess: (taskId) => {
      if (taskId) qc.invalidateQueries({ queryKey: ['task_steps', taskId] });
    },
  });
};

export const useCreateTaskStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: TablesInsert<'task_steps'>) => {
      const { data, error } = await supabase.from('task_steps').insert(step).select().single();
      if (error) throw error;
      return data as TaskStepRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['task_steps', data.task_id] });
    },
  });
};

export const useDeleteTaskStep = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, task_id }: { id: string; task_id: string }) => {
      const { error } = await supabase.from('task_steps').delete().eq('id', id);
      if (error) throw error;
      return { id, task_id };
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

export const useCreatePickingOrders = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orders: TablesInsert<'picking_orders'>[]) => {
      const { data, error } = await supabase.from('picking_orders').insert(orders).select();
      if (error) throw error;
      return data as PickingOrderRow[];
    },
    onSuccess: (_data, variables) => {
      if (variables.length > 0) {
        qc.invalidateQueries({ queryKey: ['picking_orders', variables[0].version_id] });
      }
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

// ── Work Orders ──────────────────────────────────────────────────

export const useWorkOrders = (versionId?: string) =>
  useQuery({
    queryKey: ['work_orders', versionId],
    enabled: !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select('*')
        .eq('version_id', versionId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkOrderRow[];
    },
  });

export const useCreateWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: TablesInsert<'work_orders'>) => {
      const { data, error } = await supabase.from('work_orders').insert(order).select().single();
      if (error) throw error;
      return data as WorkOrderRow;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['work_orders', variables.version_id] });
    },
  });
};

export const useUpdateWorkOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'work_orders'> & { id: string }) => {
      const { data, error } = await supabase.from('work_orders').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as WorkOrderRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['work_orders', data.version_id] });
    },
  });
};

// ── Work Order Lines ─────────────────────────────────────────────

export const useWorkOrderLines = (workOrderId?: string) =>
  useQuery({
    queryKey: ['work_order_lines', workOrderId],
    enabled: !!workOrderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_lines')
        .select('*')
        .eq('work_order_id', workOrderId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as WorkOrderLineRow[];
    },
  });

export const useCreateWorkOrderLines = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lines: TablesInsert<'work_order_lines'>[]) => {
      const { data, error } = await supabase.from('work_order_lines').insert(lines).select();
      if (error) throw error;
      return data as WorkOrderLineRow[];
    },
    onSuccess: (_data, variables) => {
      if (variables.length > 0) {
        qc.invalidateQueries({ queryKey: ['work_order_lines', variables[0].work_order_id] });
      }
    },
  });
};

// ── Shortage Alerts ──────────────────────────────────────────────

export interface AffectedWorkOrder {
  id: string;
  work_order_number: string;
  created_at: string;
  status: string;
}

export interface ShortageAlert {
  part_number: string;
  part_name: string;
  on_hand: number;
  required: number;
  shortfall: number;
  affected_work_orders: AffectedWorkOrder[];
  supplier_name: string | null;
  lead_time_days: number | null;
}

export const useShortageAlerts = (projectVersionId?: string) =>
  useQuery({
    queryKey: ['shortage_alerts', projectVersionId],
    enabled: !!projectVersionId,
    queryFn: async () => {
      // Parallel fetch BOM, inventory, work_order_lines→work_orders, suppliers
      const [bomRes, invRes, wolRes, supRes] = await Promise.all([
        supabase
          .from('bom_lines')
          .select('component_number, object_description, required_qty, bom_level')
          .eq('project_version_id', projectVersionId!),
        supabase
          .from('inventory')
          .select('part_number, on_hand_qty')
          .eq('project_version_id', projectVersionId!),
        supabase
          .from('work_order_lines')
          .select('part_number, work_orders!inner(id, work_order_number, status, created_at, version_id)')
          .eq('work_orders.version_id', projectVersionId!),
        supabase
          .from('suppliers')
          .select('part_number, supplier_name, lead_time_days'),
      ]);

      if (bomRes.error) throw bomRes.error;
      if (invRes.error) throw invRes.error;
      if (wolRes.error) throw wolRes.error;
      if (supRes.error) throw supRes.error;

      const bom = bomRes.data ?? [];
      const inv = invRes.data ?? [];
      const wol = (wolRes.data ?? []) as unknown as {
        part_number: string;
        work_orders: { id: string; work_order_number: string; status: string; created_at: string };
      }[];
      const sup = supRes.data ?? [];

      // Aggregate inventory by part_number
      const invMap = new Map<string, number>();
      inv.forEach(i => {
        invMap.set(i.part_number, (invMap.get(i.part_number) ?? 0) + (i.on_hand_qty ?? 0));
      });

      // Aggregate BOM: deduplicate by component_number, sum required_qty, capture description
      const bomMap = new Map<string, { required: number; name: string }>();
      bom.forEach(l => {
        if (l.bom_level === 0) return; // skip top-level assembly row
        const existing = bomMap.get(l.component_number);
        if (existing) {
          existing.required += Number(l.required_qty);
        } else {
          bomMap.set(l.component_number, {
            required: Number(l.required_qty),
            name: l.object_description ?? l.component_number,
          });
        }
      });

      // Map part_number → work orders that include it
      const woByPart = new Map<string, Map<string, AffectedWorkOrder>>();
      wol.forEach(line => {
        const wo = line.work_orders;
        if (!woByPart.has(line.part_number)) woByPart.set(line.part_number, new Map());
        const map = woByPart.get(line.part_number)!;
        if (!map.has(wo.id)) {
          map.set(wo.id, {
            id: wo.id,
            work_order_number: wo.work_order_number,
            created_at: wo.created_at,
            status: wo.status,
          });
        }
      });

      // Best supplier per part (shortest lead time)
      const supMap = new Map<string, { supplier_name: string; lead_time_days: number | null }>();
      sup.forEach(s => {
        const existing = supMap.get(s.part_number);
        if (!existing || (s.lead_time_days ?? Infinity) < (existing.lead_time_days ?? Infinity)) {
          supMap.set(s.part_number, { supplier_name: s.supplier_name, lead_time_days: s.lead_time_days });
        }
      });

      // Build shortage alerts
      const alerts: ShortageAlert[] = [];
      bomMap.forEach(({ required, name }, partNumber) => {
        const onHand = invMap.get(partNumber) ?? 0;
        if (onHand >= required) return; // no shortage

        const shortfall = required - onHand;
        const affectedWOs = woByPart.get(partNumber);
        const supplier = supMap.get(partNumber);

        alerts.push({
          part_number: partNumber,
          part_name: name,
          on_hand: onHand,
          required,
          shortfall,
          affected_work_orders: affectedWOs ? Array.from(affectedWOs.values()) : [],
          supplier_name: supplier?.supplier_name ?? null,
          lead_time_days: supplier?.lead_time_days ?? null,
        });
      });

      // Sort: largest shortfall first, then by nearest work order date
      alerts.sort((a, b) => {
        if (b.shortfall !== a.shortfall) return b.shortfall - a.shortfall;
        const aDate = a.affected_work_orders[0]?.created_at ?? '';
        const bDate = b.affected_work_orders[0]?.created_at ?? '';
        return aDate.localeCompare(bDate);
      });

      return alerts;
    },
  });

// ── Gate Reviews ─────────────────────────────────────────────────

export type GateReviewWithCriteria = GateReviewRow & { gate_criteria: GateCriterionRow[] };

export const useGateReviews = (projectVersionId?: string) =>
  useQuery({
    queryKey: ['gate_reviews', projectVersionId],
    enabled: !!projectVersionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gate_reviews')
        .select('*, gate_criteria(*)')
        .eq('project_version_id', projectVersionId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as GateReviewWithCriteria[];
    },
  });

export const useUpdateGateCriterion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'gate_criteria'> & { id: string }) => {
      const { data, error } = await supabase.from('gate_criteria').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as GateCriterionRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gate_reviews'] });
      qc.invalidateQueries({ queryKey: ['gate_readiness_summary'] });
    },
  });
};

// ── Gate Readiness Summary ───────────────────────────────────────

export interface GateReadinessSummary {
  criticalIssues: number;
  totalOpenIssues: number;
  bomLinesLocked: number;
  partsAvailable: number;
  totalParts: number;
  pendingSignoffs: number;
  totalCriteria: number;
}

export const useGateReadinessSummary = (projectVersionId?: string) =>
  useQuery({
    queryKey: ['gate_readiness_summary', projectVersionId],
    enabled: !!projectVersionId,
    queryFn: async () => {
      // Parallel fetch all data sources
      const [issuesRes, bomRes, invRes, reviewRes] = await Promise.all([
        supabase
          .from('issues')
          .select('priority, status')
          .eq('version_id', projectVersionId!),
        supabase
          .from('bom_lines')
          .select('component_number, required_qty, bom_level')
          .eq('project_version_id', projectVersionId!),
        supabase
          .from('inventory')
          .select('part_number, on_hand_qty')
          .eq('project_version_id', projectVersionId!),
        supabase
          .from('gate_reviews')
          .select('id')
          .eq('project_version_id', projectVersionId!)
          .limit(1)
          .maybeSingle(),
      ]);

      // Get criteria count if a review exists
      let pendingSignoffs = 0;
      let totalCriteria = 0;
      if (reviewRes.data?.id) {
        const { data: criteria } = await supabase
          .from('gate_criteria')
          .select('is_met')
          .eq('gate_review_id', reviewRes.data.id);
        totalCriteria = criteria?.length ?? 0;
        pendingSignoffs = criteria?.filter(c => !c.is_met).length ?? 0;
      }

      const issues = issuesRes.data ?? [];
      const bom = bomRes.data ?? [];
      const inv = invRes.data ?? [];

      // Critical issues: Critical priority + open status
      const criticalIssues = issues.filter(
        i => i.priority === 'Critical' && (i.status === 'Open' || i.status === 'In Progress'),
      ).length;
      const totalOpenIssues = issues.filter(
        i => i.status === 'Open' || i.status === 'In Progress',
      ).length;

      // BOM lines locked: total count of BOM lines for this version
      const bomLinesLocked = bom.length;

      // Parts available: BOM parts (level > 0, deduplicated) with on_hand_qty > 0
      const invMap = new Map<string, number>();
      inv.forEach(i => invMap.set(i.part_number, (invMap.get(i.part_number) ?? 0) + (i.on_hand_qty ?? 0)));
      const seen = new Set<string>();
      let partsAvailable = 0;
      let totalParts = 0;
      bom.forEach(l => {
        if (l.bom_level === 0 || seen.has(l.component_number)) return;
        seen.add(l.component_number);
        totalParts++;
        if ((invMap.get(l.component_number) ?? 0) > 0) partsAvailable++;
      });

      return {
        criticalIssues,
        totalOpenIssues,
        bomLinesLocked,
        partsAvailable,
        totalParts,
        pendingSignoffs,
        totalCriteria,
      } satisfies GateReadinessSummary;
    },
  });

// ── ECN Notices ──────────────────────────────────────────────────

export const useECNs = (projectVersionId?: string) =>
  useQuery({
    queryKey: ['ecn_notices', projectVersionId],
    queryFn: async () => {
      let query = supabase
        .from('ecn_notices')
        .select('*')
        .order('created_at', { ascending: false });
      if (projectVersionId) {
        query = query.eq('project_version_id', projectVersionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as EcnNoticeRow[];
    },
  });

export const useCreateECN = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ecn: TablesInsert<'ecn_notices'>) => {
      const { data, error } = await supabase.from('ecn_notices').insert(ecn).select().single();
      if (error) throw error;
      return data as EcnNoticeRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ecn_notices', data.project_version_id] });
    },
  });
};
