import { useProject } from '@/contexts/ProjectContext';
import { useTasks, useCreateTask, useCreateTaskSteps } from '@/hooks/use-supabase-data';
import { motion } from 'framer-motion';
import { ClipboardList, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { TaskCard } from '@/components/tasks/TaskCard';
import { CalendarView } from '@/components/tasks/CalendarView';
import { GanttView } from '@/components/tasks/GanttView';
import { TaskFilters, type ViewMode } from '@/components/tasks/TaskFilters';
import { PHASE_ORDER } from '@/lib/constants';

const phaseLabels: Record<string, string> = {
  'MP': 'MP — Mock-up Project',
  'EVT': 'EVT — Engineering Verification Test',
  'DVT': 'DVT — Design Verification Test',
  'PPVT': 'PPVT — Pre-Production Validation Test',
  'Production': 'Production',
};

const DEFAULT_STEPS = [
  'Kitting', 'Serial Number Gen.', 'Pallet Transfer',
  'Mech Assembly #1', 'Mech Assembly #2', 'Mech Assembly #3', 'Mech Assembly #4',
  'IPQA #1', 'Leak Test',
  'Optical Assembly #1', 'Optical Assembly #2', 'Optical Assembly #3', 'Optical Assembly #4',
  'IPQA #2', 'Fill Coolant', 'Function Test', 'FQA', 'Packing', 'Ready to Ship', 'Shipped',
];

const Tasks = () => {
  const { selectedProject, selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const { data: tasks = [], isLoading } = useTasks(versionId);
  const createTask = useCreateTask();
  const createSteps = useCreateTaskSteps();

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create task form
  const [newTask, setNewTask] = useState({
    task_name: '', phase: 'MP', assigned_to: '', start_date: '', due_date: '', priority: 'Medium', notes: '',
  });

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
    } catch (err) {
      console.error('[Tasks]', err);
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
                        {PHASE_ORDER.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
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

          <TaskFilters viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {viewMode === 'gantt' ? (
        <GanttView tasks={tasks} />
      ) : viewMode === 'calendar' ? (
        <CalendarView tasks={tasks} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      ) : (
        <div className="space-y-5">
          {PHASE_ORDER.map(phase => {
            const phaseTasks = tasks.filter(t => t.phase === phase);
            if (phaseTasks.length === 0) return null;
            return (
              <motion.div
                key={phase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{phaseLabels[phase] ?? phase}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-start">
                  {phaseTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
          {/* Tasks with no phase */}
          {tasks.filter(t => !t.phase || !PHASE_ORDER.includes(t.phase as typeof PHASE_ORDER[number])).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Unassigned Phase</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 items-start">
                {tasks.filter(t => !t.phase || !PHASE_ORDER.includes(t.phase as typeof PHASE_ORDER[number])).map(task => (
                  <TaskCard key={task.id} task={task} />
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
