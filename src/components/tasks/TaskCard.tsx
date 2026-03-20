import { TaskStepRow } from './TaskStepRow';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronDown, Plus, Loader2, Pencil, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  useTaskSteps, useUpdateTaskStep, useUpdateTaskSteps, useUpdateTask,
  useCreateTaskStep, useDeleteTaskStep, useReorderTaskSteps,
} from '@/hooks/use-supabase-data';
import type { TaskRow, TaskStepRow as TaskStepRowType } from '@/hooks/use-supabase-data';
import { PHASE_ORDER } from '@/lib/constants';

export interface TaskCardProps {
  task: TaskRow;
}

export const TaskCard = ({ task }: TaskCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: steps = [] } = useTaskSteps(isExpanded ? task.id : undefined);
  const updateStep = useUpdateTaskStep();
  const updateSteps = useUpdateTaskSteps();
  const updateTask = useUpdateTask();
  const createStep = useCreateTaskStep();
  const deleteStep = useDeleteTaskStep();
  const reorderSteps = useReorderTaskSteps();

  const [showEdit, setShowEdit] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [addingChildId, setAddingChildId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');

  // Split steps into parents (top-level) and children
  const parentSteps = useMemo(() => steps.filter(s => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order), [steps]);
  const childrenMap = useMemo(() => {
    const map = new Map<string, TaskStepRowType[]>();
    steps.filter(s => s.parent_step_id).forEach(s => {
      const list = map.get(s.parent_step_id!) ?? [];
      list.push(s);
      map.set(s.parent_step_id!, list);
    });
    // Sort children by sort_order
    map.forEach(list => list.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [steps]);
  const [editForm, setEditForm] = useState({
    task_name: task.task_name,
    phase: task.phase ?? 'MP',
    priority: task.priority,
    status: task.status,
    assigned_to: task.assigned_to ?? '',
    start_date: task.start_date ?? '',
    due_date: task.due_date ?? '',
    blocked_reason: task.blocked_reason ?? '',
    notes: task.notes ?? '',
  });

  const progress = Number(task.progress);

  const handleOpenEdit = () => {
    setEditForm({
      task_name: task.task_name,
      phase: task.phase ?? 'MP',
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to ?? '',
      start_date: task.start_date ?? '',
      due_date: task.due_date ?? '',
      blocked_reason: task.blocked_reason ?? '',
      notes: task.notes ?? '',
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.task_name.trim()) return;
    try {
      await updateTask.mutateAsync({
        id: task.id,
        task_name: editForm.task_name.trim(),
        phase: editForm.phase,
        priority: editForm.priority,
        status: editForm.status,
        assigned_to: editForm.assigned_to.trim() || null,
        start_date: editForm.start_date || null,
        due_date: editForm.due_date || null,
        blocked_reason: editForm.status === 'Blocked' ? (editForm.blocked_reason.trim() || null) : null,
        notes: editForm.notes.trim() || null,
      });
      toast.success('Task updated');
      setShowEdit(false);
    } catch (err) {
      console.error('[TaskCard]', err);
      toast.error('Failed to update task');
    }
  };

  // Rebalance weights across top-level parents and recalculate task progress
  const rebalanceWeights = async (parents: { id: string; complete: boolean }[]) => {
    if (parents.length === 0) return;
    const newWeight = +(1 / parents.length).toFixed(6);
    await updateSteps.mutateAsync(parents.map(s => ({ id: s.id, weight: newWeight })));
    const newProgress = parents.reduce((sum, s) => sum + (s.complete ? newWeight : 0), 0);
    await updateTask.mutateAsync({ id: task.id, progress: newProgress });
  };

  const recalcProgress = (parents: TaskStepRowType[], toggledId?: string, toggledComplete?: boolean) => {
    if (parents.length === 0) return 0;
    const weight = +(1 / parents.length).toFixed(6);
    return parents.reduce((sum, s) => {
      const children = childrenMap.get(s.id) ?? [];
      let isComplete: boolean;
      if (s.id === toggledId && toggledComplete !== undefined) {
        isComplete = toggledComplete;
      } else if (children.length > 0) {
        isComplete = children.every(c => c.complete);
      } else {
        isComplete = s.complete;
      }
      return sum + (isComplete ? weight : 0);
    }, 0);
  };

  // Add a top-level parent step
  const handleAddStep = async () => {
    if (!newStepName.trim()) return;
    try {
      const created = await createStep.mutateAsync({
        task_id: task.id,
        step_name: newStepName.trim(),
        weight: 0,
        sort_order: parentSteps.length,
        parent_step_id: null,
      });
      const allParents = [...parentSteps, created];
      await rebalanceWeights(allParents);
      setNewStepName('');
      setShowAddStep(false);
      toast.success('Sub-task added');
    } catch (err) {
      console.error('[TaskCard]', err);
      toast.error('Failed to add sub-task');
    }
  };

  // Add a child item under a parent step
  const handleAddChild = async (parentId: string) => {
    if (!newChildName.trim()) return;
    try {
      const siblings = childrenMap.get(parentId) ?? [];
      await createStep.mutateAsync({
        task_id: task.id,
        step_name: newChildName.trim(),
        weight: 0,
        sort_order: siblings.length,
        parent_step_id: parentId,
      });
      setNewChildName('');
      setAddingChildId(null);
      toast.success('Item added');
    } catch (err) {
      console.error('[TaskCard]', err);
      toast.error('Failed to add item');
    }
  };

  const handleDeleteStep = async (stepToDelete: TaskStepRowType) => {
    try {
      await deleteStep.mutateAsync({ id: stepToDelete.id, task_id: task.id });
      // If deleting a parent, rebalance remaining parents
      if (!stepToDelete.parent_step_id) {
        const remaining = parentSteps.filter(s => s.id !== stepToDelete.id);
        if (remaining.length > 0) {
          await rebalanceWeights(remaining);
        } else {
          await updateTask.mutateAsync({ id: task.id, progress: 0 });
        }
      }
      toast.success('Removed');
    } catch (err) {
      console.error('[TaskCard]', err);
      toast.error('Failed to remove');
    }
  };

  // Toggle a top-level parent step (only if it has no children)
  const handleToggleStep = async (step: TaskStepRowType) => {
    const children = childrenMap.get(step.id) ?? [];
    // If parent has children, don't allow manual toggle — it auto-completes
    if (children.length > 0) return;
    const newComplete = !step.complete;
    try {
      await updateStep.mutateAsync({ id: step.id, complete: newComplete });
      const newProgress = recalcProgress(parentSteps, step.id, newComplete);
      await updateTask.mutateAsync({ id: task.id, progress: newProgress });
    } catch (err) {
      console.error('[TaskCard]', err);
      toast.error('Failed to update step');
    }
  };

  // Toggle a child item and auto-complete parent if all children done
  const handleToggleChild = async (child: TaskStepRowType, siblings: TaskStepRowType[], parent: TaskStepRowType) => {
    const newComplete = !child.complete;
    try {
      await updateStep.mutateAsync({ id: child.id, complete: newComplete });
      // Check if all siblings are now complete
      const allChildrenComplete = siblings.every(c => c.id === child.id ? newComplete : c.complete);
      const parentWasComplete = parent.complete;
      if (allChildrenComplete !== parentWasComplete) {
        await updateStep.mutateAsync({ id: parent.id, complete: allChildrenComplete });
      }
      // Recalculate task progress
      const weight = parentSteps.length > 0 ? +(1 / parentSteps.length).toFixed(6) : 0;
      const newProgress = parentSteps.reduce((sum, p) => {
        let isComplete: boolean;
        if (p.id === parent.id) {
          isComplete = allChildrenComplete;
        } else {
          const pChildren = childrenMap.get(p.id) ?? [];
          isComplete = pChildren.length > 0 ? pChildren.every(c => c.complete) : p.complete;
        }
        return sum + (isComplete ? weight : 0);
      }, 0);
      await updateTask.mutateAsync({ id: task.id, progress: newProgress });
    } catch (err) {
      console.error('[TaskCard]', err);
      toast.error('Failed to update item');
    }
  };

  // Reorder parent steps
  const handleReorderParent = async (step: TaskStepRowType, direction: 'up' | 'down') => {
    const idx = parentSteps.findIndex(s => s.id === step.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= parentSteps.length) return;
    const target = parentSteps[targetIdx];
    try {
      await reorderSteps.mutateAsync([
        { id: step.id, sort_order: target.sort_order, task_id: task.id },
        { id: target.id, sort_order: step.sort_order, task_id: task.id },
      ]);
    } catch (err) { console.error('[TaskCard]', err); toast.error('Failed to reorder'); }
  };

  // Reorder child steps within a parent
  const handleReorderChild = async (child: TaskStepRowType, siblings: TaskStepRowType[], direction: 'up' | 'down') => {
    const idx = siblings.findIndex(s => s.id === child.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const target = siblings[targetIdx];
    try {
      await reorderSteps.mutateAsync([
        { id: child.id, sort_order: target.sort_order, task_id: task.id },
        { id: target.id, sort_order: child.sort_order, task_id: task.id },
      ]);
    } catch (err) { console.error('[TaskCard]', err); toast.error('Failed to reorder'); }
  };

  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between mb-2">
        <span className={cn(
          "text-[10px] font-semibold uppercase tracking-wider",
          task.status === 'Complete' && "text-ops-green",
          task.status === 'In Progress' && "text-foreground",
          task.status === 'Blocked' && "text-accent",
          task.status === 'Not Started' && "text-muted-foreground",
        )}>
          {task.status}
        </span>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] font-medium",
            task.priority === 'Critical' && "text-accent",
            task.priority === 'High' && "text-foreground",
            task.priority === 'Medium' && "text-muted-foreground",
            task.priority === 'Low' && "text-muted-foreground/60",
          )}>
            {task.priority}
          </span>
          <button
            onClick={handleOpenEdit}
            className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit task"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>
      <h4 className="text-sm font-medium text-foreground mb-2">{task.task_name}</h4>

      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full text-left mb-2 cursor-pointer group"
      >
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span className="flex items-center gap-1">
            Progress
            <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
          </span>
          <span className="font-mono">{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-300",
              progress >= 1 ? "bg-ops-green" : "bg-foreground"
            )}
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border pt-2 mt-1">
              {parentSteps.length > 0 ? (
                <div className="space-y-0.5">
                  {parentSteps.map(step => (
                    <TaskStepRow
                      key={step.id}
                      step={step}
                      children={childrenMap.get(step.id) ?? []}
                      totalParents={parentSteps.length}
                      onToggle={handleToggleStep}
                      onToggleChild={handleToggleChild}
                      onDelete={handleDeleteStep}
                      onAddChild={handleAddChild}
                      onReorder={handleReorderParent}
                      onReorderChild={handleReorderChild}
                      addingChildId={addingChildId}
                      setAddingChildId={setAddingChildId}
                      newChildName={newChildName}
                      setNewChildName={setNewChildName}
                      isAddingChild={createStep.isPending}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground py-1">No sub-tasks defined</p>
              )}

              {/* Add top-level sub-task */}
              {showAddStep ? (
                <div className="flex items-center gap-1.5 pt-1.5">
                  <input
                    type="text"
                    value={newStepName}
                    onChange={e => setNewStepName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddStep()}
                    placeholder="Sub-task name..."
                    className="flex-1 rounded border border-input bg-background px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                  <button
                    onClick={handleAddStep}
                    disabled={createStep.isPending || !newStepName.trim()}
                    className="rounded bg-accent px-2 py-1 text-[10px] font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors"
                  >
                    {createStep.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                  </button>
                  <button
                    onClick={() => { setShowAddStep(false); setNewStepName(''); }}
                    className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddStep(true)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-1.5"
                >
                  <Plus className="h-3 w-3" />
                  Add sub-task
                </button>
              )}

              {/* Summary */}
              {parentSteps.length > 0 && (
                <div className="flex justify-end pt-1 border-t border-border/50 mt-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {parentSteps.length} sub-tasks · {Math.round(
                      parentSteps.filter(p => {
                        const children = childrenMap.get(p.id) ?? [];
                        return children.length > 0 ? children.every(c => c.complete) : p.complete;
                      }).length / parentSteps.length * 100
                    )}% complete
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
        <span>{task.assigned_to ? task.assigned_to.split('@')[0] : '—'}</span>
        <span>{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</span>
      </div>
      {task.status === 'Blocked' && task.blocked_reason && (
        <div className="mt-2 flex items-start gap-1.5 rounded border border-accent/20 bg-accent/5 p-2 text-[11px] text-accent">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          {task.blocked_reason}
        </div>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Task Name *</Label>
              <Input value={editForm.task_name} onChange={e => setEditForm(p => ({ ...p, task_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phase</Label>
                <Select value={editForm.phase} onValueChange={v => setEditForm(p => ({ ...p, phase: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PHASE_ORDER.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={v => setEditForm(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Not Started', 'In Progress', 'Blocked', 'Complete'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editForm.status === 'Blocked' && (
              <div>
                <Label>Blocked Reason</Label>
                <Input value={editForm.blocked_reason} onChange={e => setEditForm(p => ({ ...p, blocked_reason: e.target.value }))} placeholder="Why is this task blocked?" />
              </div>
            )}
            <div>
              <Label>Assigned To</Label>
              <Input value={editForm.assigned_to} onChange={e => setEditForm(p => ({ ...p, assigned_to: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={editForm.start_date} onChange={e => setEditForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={editForm.due_date} onChange={e => setEditForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Additional notes..." />
            </div>
            <Button onClick={handleSaveEdit} disabled={updateTask.isPending || !editForm.task_name.trim()} className="w-full">
              {updateTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
