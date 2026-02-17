import { useProject } from '@/contexts/ProjectContext';
import { useTasks, useTaskSteps, useCreateTask, useCreateTaskSteps, useUpdateTask, useUpdateTaskStep, type TaskRow, type TaskStepRow } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, AlertCircle, ChevronDown, Check, CalendarDays, Plus, Loader2 } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
  const updateTask = useUpdateTask();

  const progress = Number(task.progress);

  const handleToggleStep = async (step: TaskStepRow) => {
    const newComplete = !step.complete;
    try {
      await updateStep.mutateAsync({ id: step.id, complete: newComplete });
      // Recalculate task progress
      const newProgress = steps.reduce((sum, s) => {
        const isComplete = s.id === step.id ? newComplete : s.complete;
        return sum + (isComplete ? Number(s.weight) : 0);
      }, 0);
      await updateTask.mutateAsync({ id: task.id, progress: newProgress });
    } catch {
      toast.error('Failed to update step');
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
        <span className={cn(
          "text-[10px] font-medium",
          task.priority === 'Critical' && "text-accent",
          task.priority === 'High' && "text-foreground",
          task.priority === 'Medium' && "text-muted-foreground",
          task.priority === 'Low' && "text-muted-foreground/60",
        )}>
          {task.priority}
        </span>
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
            <div className="border-t border-border pt-2 mt-1 space-y-1">
              {steps.map(step => (
                <button
                  key={step.id}
                  onClick={() => handleToggleStep(step)}
                  className="flex items-center gap-2 text-[11px] w-full text-left py-0.5 rounded hover:bg-muted/30 transition-colors group/step"
                >
                  <div className={cn(
                    "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                    step.complete
                      ? "bg-ops-green/15 border-ops-green/40"
                      : "border-border bg-muted/30 group-hover/step:border-muted-foreground"
                  )}>
                    {step.complete && <Check className="h-2.5 w-2.5 text-ops-green" />}
                  </div>
                  <span className={cn(
                    "flex-1 transition-colors",
                    step.complete ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {step.step_name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {Math.round(Number(step.weight) * 100)}%
                  </span>
                </button>
              ))}
              {steps.length === 0 && (
                <p className="text-[11px] text-muted-foreground py-1">No steps defined</p>
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
