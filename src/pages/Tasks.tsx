import { useProject } from '@/contexts/ProjectContext';
import { useTasks, useTaskSteps, useCreateTask, useCreateTaskSteps, useCreateTaskStep, useDeleteTaskStep, useUpdateTask, useUpdateTaskStep, useUpdateTaskSteps, type TaskRow, type TaskStepRow } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, AlertCircle, ChevronDown, Check, CalendarDays, Plus, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const phaseOrder = ['MP', 'EVT', 'DVT', 'PPVT', 'Production'] as const;

const phaseLabels: Record<string, string> = {
  'MP': 'MP — Mock-up Project',
  'EVT': 'EVT — Engineering Verification Test',
  'DVT': 'DVT — Design Verification Test',
  'PPVT': 'PPVT — Pre-Production Validation Test',
  'Production': 'Production',
};

type ViewMode = 'cards' | 'calendar';

const DEFAULT_STEPS = [
  'Kitting', 'Serial Number Gen.', 'Pallet Transfer',
  'Mech Assembly #1', 'Mech Assembly #2', 'Mech Assembly #3', 'Mech Assembly #4',
  'IPQA #1', 'Leak Test',
  'Optical Assembly #1', 'Optical Assembly #2', 'Optical Assembly #3', 'Optical Assembly #4',
  'IPQA #2', 'Fill Coolant', 'Function Test', 'FQA', 'Packing', 'Ready to Ship', 'Shipped',
];

const ParentStep = ({
  step,
  children,
  totalParents,
  onToggle,
  onToggleChild,
  onDelete,
  onAddChild,
  addingChildId,
  setAddingChildId,
  newChildName,
  setNewChildName,
  isAddingChild,
}: {
  step: TaskStepRow;
  children: TaskStepRow[];
  totalParents: number;
  onToggle: (step: TaskStepRow) => void;
  onToggleChild: (child: TaskStepRow, siblings: TaskStepRow[], parent: TaskStepRow) => void;
  onDelete: (step: TaskStepRow) => void;
  onAddChild: (parentId: string) => void;
  addingChildId: string | null;
  setAddingChildId: (id: string | null) => void;
  newChildName: string;
  setNewChildName: (name: string) => void;
  isAddingChild: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const completedChildren = children.filter(c => c.complete).length;
  const childProgress = children.length > 0 ? Math.round((completedChildren / children.length) * 100) : null;
  const isParentComplete = children.length > 0 ? completedChildren === children.length : step.complete;

  return (
    <div className="space-y-0.5">
      {/* Parent row */}
      <div className="flex items-center gap-1.5 text-[11px] py-0.5 rounded hover:bg-muted/30 transition-colors group/step">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-0", !expanded && "-rotate-90")} />
        </button>
        <button
          onClick={() => onToggle(step)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          <div className={cn(
            "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
            isParentComplete
              ? "bg-ops-green/15 border-ops-green/40"
              : "border-border bg-muted/30 group-hover/step:border-muted-foreground"
          )}>
            {isParentComplete && <Check className="h-2.5 w-2.5 text-ops-green" />}
          </div>
          <span className={cn(
            "flex-1 font-medium transition-colors",
            isParentComplete ? "text-muted-foreground line-through" : "text-foreground"
          )}>
            {step.step_name}
          </span>
        </button>
        {children.length > 0 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {completedChildren}/{children.length}
          </span>
        )}
        <span className="font-mono text-[10px] text-muted-foreground">
          {totalParents > 0 ? Math.round((1 / totalParents) * 100) : 0}%
        </span>
        <button
          onClick={() => onDelete(step)}
          className="p-0.5 rounded opacity-0 group-hover/step:opacity-100 text-muted-foreground hover:text-accent transition-all"
          title="Remove"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="ml-5 pl-2 border-l border-border/50 space-y-0.5">
              {children.map(child => (
                <div
                  key={child.id}
                  className="flex items-center gap-2 text-[11px] py-0.5 rounded hover:bg-muted/30 transition-colors group/child"
                >
                  <button
                    onClick={() => onToggleChild(child, children, step)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <div className={cn(
                      "h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                      child.complete
                        ? "bg-ops-green/15 border-ops-green/40"
                        : "border-border bg-muted/30 group-hover/child:border-muted-foreground"
                    )}>
                      {child.complete && <Check className="h-2 w-2 text-ops-green" />}
                    </div>
                    <span className={cn(
                      "flex-1 transition-colors text-[11px]",
                      child.complete ? "text-muted-foreground line-through" : "text-foreground"
                    )}>
                      {child.step_name}
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete(child)}
                    className="p-0.5 rounded opacity-0 group-hover/child:opacity-100 text-muted-foreground hover:text-accent transition-all"
                    title="Remove"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}

              {/* Add child input */}
              {addingChildId === step.id ? (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <input
                    type="text"
                    value={newChildName}
                    onChange={e => setNewChildName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') onAddChild(step.id);
                      if (e.key === 'Escape') setAddingChildId(null);
                    }}
                    placeholder="Item name..."
                    className="flex-1 rounded border border-input bg-background px-2 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                  <button
                    onClick={() => onAddChild(step.id)}
                    disabled={isAddingChild || !newChildName.trim()}
                    className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                  >
                    {isAddingChild ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
                  </button>
                  <button
                    onClick={() => { setAddingChildId(null); setNewChildName(''); }}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingChildId(step.id); setNewChildName(''); }}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-0.5"
                >
                  <Plus className="h-2.5 w-2.5" />
                  Add item
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskCard = ({
  task,
  expandedTaskId,
  onToggleExpand,
}: {
  task: TaskRow;
  expandedTaskId: string | null;
  onToggleExpand: (id: string) => void;
}) => {
  const isExpanded = expandedTaskId === task.id;
  const { data: steps = [] } = useTaskSteps(isExpanded ? task.id : undefined);
  const updateStep = useUpdateTaskStep();
  const updateSteps = useUpdateTaskSteps();
  const updateTask = useUpdateTask();
  const createStep = useCreateTaskStep();
  const deleteStep = useDeleteTaskStep();

  const [showEdit, setShowEdit] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [addingChildId, setAddingChildId] = useState<string | null>(null);
  const [newChildName, setNewChildName] = useState('');

  // Split steps into parents (top-level) and children
  const parentSteps = useMemo(() => steps.filter(s => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order), [steps]);
  const childrenMap = useMemo(() => {
    const map = new Map<string, TaskStepRow[]>();
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
    } catch {
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

  const recalcProgress = (parents: TaskStepRow[], toggledId?: string, toggledComplete?: boolean) => {
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
    } catch {
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
    } catch {
      toast.error('Failed to add item');
    }
  };

  const handleDeleteStep = async (stepToDelete: TaskStepRow) => {
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
    } catch {
      toast.error('Failed to remove');
    }
  };

  // Toggle a top-level parent step (only if it has no children)
  const handleToggleStep = async (step: TaskStepRow) => {
    const children = childrenMap.get(step.id) ?? [];
    // If parent has children, don't allow manual toggle — it auto-completes
    if (children.length > 0) return;
    const newComplete = !step.complete;
    try {
      await updateStep.mutateAsync({ id: step.id, complete: newComplete });
      const newProgress = recalcProgress(parentSteps, step.id, newComplete);
      await updateTask.mutateAsync({ id: task.id, progress: newProgress });
    } catch {
      toast.error('Failed to update step');
    }
  };

  // Toggle a child item and auto-complete parent if all children done
  const handleToggleChild = async (child: TaskStepRow, siblings: TaskStepRow[], parent: TaskStepRow) => {
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
    } catch {
      toast.error('Failed to update item');
    }
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
        onClick={() => onToggleExpand(task.id)}
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
                    <ParentStep
                      key={step.id}
                      step={step}
                      children={childrenMap.get(step.id) ?? []}
                      totalParents={parentSteps.length}
                      onToggle={handleToggleStep}
                      onToggleChild={handleToggleChild}
                      onDelete={handleDeleteStep}
                      onAddChild={handleAddChild}
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
                    {phaseOrder.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

const CalendarView = ({ tasks, selectedDate, onSelectDate }: { tasks: TaskRow[]; selectedDate: Date | undefined; onSelectDate: (d: Date | undefined) => void }) => {
  const taskDates = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    tasks.forEach(t => {
      const dates: string[] = [];
      if (t.due_date) dates.push(t.due_date.split('T')[0]);
      if (t.start_date) dates.push(t.start_date.split('T')[0]);
      dates.forEach(d => {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(t);
      });
    });
    return map;
  }, [tasks]);

  const tasksForSelected = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toISOString().split('T')[0];
    return taskDates.get(key) ?? [];
  }, [selectedDate, taskDates]);

  const modifiers = useMemo(() => {
    const dates = Array.from(taskDates.keys()).map(d => new Date(d + 'T00:00:00'));
    return { hasTask: dates };
  }, [taskDates]);

  const modifiersStyles = {
    hasTask: {
      fontWeight: 700,
      textDecoration: 'underline',
      textDecorationColor: 'hsl(349 80% 45%)',
      textUnderlineOffset: '3px',
    },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <div className="kpi-card flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelectDate}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="p-3 pointer-events-auto"
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {selectedDate
            ? `Tasks for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Select a date to view tasks'}
        </h3>
        {tasksForSelected.length === 0 && selectedDate && (
          <p className="text-xs text-muted-foreground">No tasks on this date</p>
        )}
        {tasksForSelected.map(task => (
          <div key={task.id} className={cn(
            "rounded-md border p-3 text-xs space-y-1",
            task.status === 'Complete' && "bg-ops-green/20 text-ops-green border-ops-green/30",
            task.status === 'In Progress' && "bg-primary/10 text-foreground border-primary/20",
            task.status === 'Blocked' && "bg-accent/10 text-accent border-accent/30",
            task.status === 'Not Started' && "bg-muted text-muted-foreground border-border",
          )}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{task.task_name}</span>
              <span className="text-[10px] font-semibold uppercase">{task.status}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
              <span>{task.phase}</span>
              <span>{task.assigned_to ? task.assigned_to.split('@')[0] : '—'}</span>
              <span>Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</span>
              <span className="font-mono">{Math.round(Number(task.progress) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Tasks = () => {
  const { selectedProject, selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const { data: tasks = [], isLoading } = useTasks(versionId);
  const createTask = useCreateTask();
  const createSteps = useCreateTaskSteps();

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create task form
  const [newTask, setNewTask] = useState({
    task_name: '', phase: 'MP', assigned_to: '', start_date: '', due_date: '', priority: 'Medium', notes: '',
  });

  const toggleExpand = useCallback((taskId: string) => {
    setExpandedTaskId(prev => prev === taskId ? null : taskId);
  }, []);

  const handleCreateTask = async () => {
    if (!selectedProject || !selectedVersion || !newTask.task_name.trim()) return;
    try {
      const created = await createTask.mutateAsync({
        project_id: selectedProject.id,
        version_id: selectedVersion.id,
        task_name: newTask.task_name.trim(),
        phase: newTask.phase,
        assigned_to: newTask.assigned_to.trim() || null,
        start_date: newTask.start_date || null,
        due_date: newTask.due_date || null,
        priority: newTask.priority,
        notes: newTask.notes.trim() || null,
      });
      // Create default steps
      const steps = DEFAULT_STEPS.map((name, i) => ({
        task_id: created.id,
        step_name: name,
        weight: 0.05,
        sort_order: i,
      }));
      await createSteps.mutateAsync(steps);
      toast.success('Task created with default steps');
      setShowCreateForm(false);
      setNewTask({ task_name: '', phase: 'MP', assigned_to: '', start_date: '', due_date: '', priority: 'Medium', notes: '' });
    } catch {
      toast.error('Failed to create task');
    }
  };

  if (!selectedVersion) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" /> Project Management
          </h2>
          <p className="text-xs text-muted-foreground">{tasks.length} tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90">
                <Plus className="h-3.5 w-3.5" />
                New Task
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label>Task Name *</Label>
                  <Input value={newTask.task_name} onChange={e => setNewTask(p => ({ ...p, task_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phase</Label>
                    <Select value={newTask.phase} onValueChange={v => setNewTask(p => ({ ...p, phase: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {phaseOrder.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Input value={newTask.assigned_to} onChange={e => setNewTask(p => ({ ...p, assigned_to: e.target.value }))} placeholder="email@example.com" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={newTask.start_date} onChange={e => setNewTask(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleCreateTask} disabled={createTask.isPending || !newTask.task_name.trim()} className="w-full">
                  {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                viewMode === 'cards'
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardList className="h-3 w-3" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                viewMode === 'calendar'
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="h-3 w-3" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      ) : (
        <div className="space-y-5">
          {phaseOrder.map(phase => {
            const phaseTasks = tasks.filter(t => t.phase === phase);
            if (phaseTasks.length === 0) return null;
            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{phaseLabels[phase] ?? phase}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {phaseTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      expandedTaskId={expandedTaskId}
                      onToggleExpand={toggleExpand}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
          {/* Tasks with no phase */}
          {tasks.filter(t => !t.phase || !phaseOrder.includes(t.phase as typeof phaseOrder[number])).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Unassigned Phase</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tasks.filter(t => !t.phase || !phaseOrder.includes(t.phase as typeof phaseOrder[number])).map(task => (
                  <TaskCard key={task.id} task={task} expandedTaskId={expandedTaskId} onToggleExpand={toggleExpand} />
                ))}
              </div>
            </motion.div>
          )}
          {tasks.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground">No tasks yet. Create one to get started.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tasks;
