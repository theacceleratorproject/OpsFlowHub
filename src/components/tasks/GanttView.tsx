import { DragGrip } from './TaskStepRow';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, ChevronDown, Plus, Loader2, Trash2, X } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { differenceInDays, addDays, startOfDay, format, eachDayOfInterval, isSameDay } from 'date-fns';
import {
  useTaskSteps, useUpdateTaskStep, useUpdateTaskSteps, useUpdateTask,
  useCreateTaskStep, useDeleteTaskStep, useReorderTaskSteps, useDeleteTask,
} from '@/hooks/use-supabase-data';
import type { TaskRow, TaskStepRow } from '@/hooks/use-supabase-data';
import { PHASE_ORDER } from '@/lib/constants';
import { useRole } from '@/contexts/AuthContext';

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_WIDTH = 36;

const phaseLabels: Record<string, string> = {
  'MP': 'MP — Mock-up Project',
  'EVT': 'EVT — Engineering Verification Test',
  'DVT': 'DVT — Design Verification Test',
  'PPVT': 'PPVT — Pre-Production Validation Test',
  'Production': 'Production',
};

const STEP_STATUS_OPTIONS = [
  { value: 'Not Started', label: 'NS', color: 'bg-muted-foreground/40', activeColor: 'bg-muted-foreground' },
  { value: 'In Progress', label: 'IP', color: 'bg-blue-500/30', activeColor: 'bg-blue-500' },
  { value: 'Blocked', label: 'BL', color: 'bg-accent/30', activeColor: 'bg-accent' },
  { value: 'Complete', label: 'DN', color: 'bg-ops-green/30', activeColor: 'bg-ops-green' },
] as const;

const STATUS_OPTIONS = [
  { value: 'Not Started', label: 'NS', color: 'bg-muted-foreground/40', activeColor: 'bg-muted-foreground' },
  { value: 'In Progress', label: 'IP', color: 'bg-blue-500/30', activeColor: 'bg-blue-500' },
  { value: 'Blocked', label: 'BL', color: 'bg-accent/30', activeColor: 'bg-accent' },
  { value: 'Complete', label: 'DN', color: 'bg-ops-green/30', activeColor: 'bg-ops-green' },
] as const;

// ── GanttStepRow (sub-task row inside expanded task) ───────────────────────

const GanttStepRow = ({
  step,
  children: childSteps,
  allParents: _allParents,
  timelineStart,
  timelineDays,
  todayOffset: _todayOffset,
  onToggle,
  onToggleChild,
  onDelete,
  onAddChild,
  onReorder,
  onReorderChild,
  onUpdateStepDates,
  onDoubleClickStep,
  canDelete,
}: {
  step: TaskStepRow;
  children: TaskStepRow[];
  allParents: TaskStepRow[];
  timelineStart: Date;
  timelineDays: Date[];
  todayOffset: number;
  onToggle: (s: TaskStepRow) => void;
  onToggleChild: (child: TaskStepRow, siblings: TaskStepRow[], parent: TaskStepRow) => void;
  onDelete: (s: TaskStepRow) => void;
  onAddChild: (parentId: string) => void;
  onReorder: (step: TaskStepRow, direction: 'up' | 'down') => void;
  onReorderChild: (child: TaskStepRow, siblings: TaskStepRow[], direction: 'up' | 'down') => void;
  onUpdateStepDates: (stepId: string, startDate: string, dueDate: string) => void;
  onDoubleClickStep: (step: TaskStepRow, children: TaskStepRow[], e: React.MouseEvent) => void;
  canDelete: boolean;
}) => {
  const completedChildren = childSteps.filter(c => c.complete).length;
  const isComplete = childSteps.length > 0 ? completedChildren === childSteps.length : step.complete;

  // Step date bar calculations
  const stepStart = step.start_date ? startOfDay(new Date(step.start_date)) : null;
  const stepEnd = step.due_date ? startOfDay(new Date(step.due_date)) : null;
  let barLeft = 0, barWidth = 0, showBar = false;
  if (stepStart && stepEnd) {
    barLeft = differenceInDays(stepStart, timelineStart) * DAY_WIDTH;
    barWidth = (differenceInDays(stepEnd, stepStart) + 1) * DAY_WIDTH;
    showBar = true;
  } else if (stepStart) {
    barLeft = differenceInDays(stepStart, timelineStart) * DAY_WIDTH;
    barWidth = DAY_WIDTH;
    showBar = true;
  } else if (stepEnd) {
    barLeft = differenceInDays(stepEnd, timelineStart) * DAY_WIDTH;
    barWidth = DAY_WIDTH;
    showBar = true;
  }

  // Drawing state — draw-to-assign dates for steps without dates
  const [stepDrawing, setStepDrawing] = useState<{ startCol: number; endCol: number } | null>(null);
  const stepDrawRef = useRef(stepDrawing);
  stepDrawRef.current = stepDrawing;

  useEffect(() => {
    if (!stepDrawing) return;
    const el = document.querySelector(`[data-step-timeline="${step.id}"]`);
    const handleMove = (e: MouseEvent) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const col = Math.max(0, Math.min(timelineDays.length - 1, Math.floor(x / DAY_WIDTH)));
      setStepDrawing(prev => prev ? { ...prev, endCol: col } : null);
    };
    const handleUp = () => {
      const d = stepDrawRef.current;
      if (d) {
        const sc = Math.min(d.startCol, d.endCol);
        const ec = Math.max(d.startCol, d.endCol);
        const sd = timelineDays[sc];
        const ed = timelineDays[ec];
        if (sd && ed) onUpdateStepDates(step.id, format(sd, 'yyyy-MM-dd'), format(ed, 'yyyy-MM-dd'));
      }
      setStepDrawing(null);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
  }, [!!stepDrawing]);

  // Dragging state — resize/move existing step bar
  const [stepDrag, setStepDrag] = useState<{
    edge: 'left' | 'right' | 'move'; startX: number;
    origStart: string; origEnd: string;
    _newStart?: string; _newEnd?: string;
  } | null>(null);
  const stepDragRef = useRef(stepDrag);
  stepDragRef.current = stepDrag;

  useEffect(() => {
    if (!stepDrag) return;
    const initStartX = stepDrag.startX;
    const initOrigStart = stepDrag.origStart;
    const initOrigEnd = stepDrag.origEnd;
    const initEdge = stepDrag.edge;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - initStartX;
      const daysDelta = Math.round(dx / DAY_WIDTH);
      const origS = startOfDay(new Date(initOrigStart));
      const origE = startOfDay(new Date(initOrigEnd));
      let ns = origS, ne = origE;
      if (initEdge === 'left') { ns = addDays(origS, daysDelta); if (ns > ne) ns = ne; }
      else if (initEdge === 'right') { ne = addDays(origE, daysDelta); if (ne < ns) ne = ns; }
      else { ns = addDays(origS, daysDelta); ne = addDays(origE, daysDelta); }
      setStepDrag(prev => prev ? { ...prev, _newStart: format(ns, 'yyyy-MM-dd'), _newEnd: format(ne, 'yyyy-MM-dd') } : null);
    };
    const handleUp = () => {
      const d = stepDragRef.current;
      if (d) {
        const ns = d._newStart ?? d.origStart;
        const ne = d._newEnd ?? d.origEnd;
        if (ns !== d.origStart || ne !== d.origEnd) onUpdateStepDates(step.id, ns, ne);
      }
      setStepDrag(null);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
  }, [!!stepDrag]);

  // Compute display bar (uses drag state if active)
  const displayStart = stepDrag?._newStart ? startOfDay(new Date(stepDrag._newStart)) : stepStart;
  const displayEnd = stepDrag?._newEnd ? startOfDay(new Date(stepDrag._newEnd)) : stepEnd;
  let dispBarLeft = barLeft, dispBarWidth = barWidth;
  if (stepDrag && displayStart && displayEnd) {
    dispBarLeft = differenceInDays(displayStart, timelineStart) * DAY_WIDTH;
    dispBarWidth = (differenceInDays(displayEnd, displayStart) + 1) * DAY_WIDTH;
  }

  // Drawing preview calculations
  const drawLeft = stepDrawing ? Math.min(stepDrawing.startCol, stepDrawing.endCol) * DAY_WIDTH : 0;
  const drawWidth = stepDrawing ? (Math.abs(stepDrawing.endCol - stepDrawing.startCol) + 1) * DAY_WIDTH : 0;

  return (
    <>
      {/* Parent step row */}
      <div className="flex group/srow" onDoubleClick={e => onDoubleClickStep(step, childSteps, e)}>
        {/* Left label */}
        <div className="shrink-0 w-[220px] border-r border-border bg-card z-10 h-7 flex items-center pl-5 pr-2 border-b border-border/30 gap-1">
          <DragGrip onReorder={(dir) => onReorder(step, dir)} />
          <button onClick={() => onToggle(step)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
            <div className={cn(
              "h-3 w-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
              step.status === 'Complete' || isComplete ? "bg-ops-green/15 border-ops-green/40" :
              step.status === 'In Progress' ? "bg-blue-500/15 border-blue-500/40" :
              step.status === 'Blocked' ? "bg-accent/15 border-accent/40" : "border-border",
            )}>
              {isComplete && <Check className="h-2 w-2 text-ops-green" />}
              {step.status === 'Blocked' && !isComplete && <AlertCircle className="h-2 w-2 text-accent" />}
            </div>
            <span className={cn("text-[10px] truncate", isComplete ? "text-muted-foreground line-through" : step.status === 'Blocked' ? "text-accent" : "text-foreground")}>{step.step_name}</span>
            {step.assigned_to && (
              <span className="text-[8px] text-muted-foreground/60 truncate shrink-0 max-w-[50px]">{step.assigned_to.split('@')[0]}</span>
            )}
          </button>
          {childSteps.length > 0 && (
            <span className="text-[9px] font-mono text-muted-foreground">{completedChildren}/{childSteps.length}</span>
          )}
          <button onClick={() => onAddChild(step.id)} className="p-0.5 opacity-0 group-hover/srow:opacity-100 text-muted-foreground hover:text-foreground transition-all" title="Add item">
            <Plus className="h-2.5 w-2.5" />
          </button>
          {canDelete && (
            <button onClick={() => onDelete(step)} className="p-0.5 opacity-0 group-hover/srow:opacity-100 text-muted-foreground hover:text-accent transition-all" title="Remove">
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
        {/* Right timeline — date bar or draw zone */}
        <div
          className={cn("flex-1 h-7 border-b border-border/30 relative", !showBar && "cursor-crosshair")}
          data-step-timeline={step.id}
          onMouseDown={!showBar && !stepDrawing ? (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const col = Math.max(0, Math.min(timelineDays.length - 1, Math.floor(x / DAY_WIDTH)));
            setStepDrawing({ startCol: col, endCol: col });
          } : undefined}
        >
          {/* Weekend shading */}
          {timelineDays.map((day, i) => {
            if (day.getDay() !== 0 && day.getDay() !== 6) return null;
            return <div key={i} className="absolute top-0 bottom-0 bg-muted/20" style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }} />;
          })}

          {/* Drawing preview */}
          {stepDrawing && !showBar && (
            <div className="absolute top-1 h-5 rounded-sm bg-accent/20 border border-accent/40 pointer-events-none z-20"
              style={{ left: drawLeft, width: drawWidth }}>
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono text-accent">
                {Math.abs(stepDrawing.endCol - stepDrawing.startCol) + 1}d
              </span>
            </div>
          )}

          {/* Date bar */}
          {showBar ? (
            <div
              className={cn("absolute top-1 h-5 flex items-center group/sbar", stepStart && stepEnd ? "cursor-grab active:cursor-grabbing" : "")}
              style={{ left: dispBarLeft, width: dispBarWidth }}
              onMouseDown={stepStart && stepEnd ? (e) => {
                e.preventDefault();
                setStepDrag({ edge: 'move', startX: e.clientX, origStart: step.start_date!, origEnd: step.due_date! });
              } : undefined}
            >
              <div className={cn("absolute inset-0 rounded-sm",
                step.status === 'Complete' ? "bg-ops-green/30" :
                step.status === 'In Progress' ? "bg-blue-500/25" :
                step.status === 'Blocked' ? "bg-accent/25" : "bg-muted-foreground/20"
              )} />
              <div className={cn("absolute top-0 bottom-0 left-0 rounded-sm",
                step.status === 'Complete' ? "bg-ops-green/60" :
                step.status === 'In Progress' ? "bg-blue-500/50" :
                step.status === 'Blocked' ? "bg-accent/50" : "bg-muted-foreground/30"
              )}
                style={{ width: childSteps.length > 0 ? `${(completedChildren / childSteps.length) * 100}%` : isComplete ? '100%' : '0%' }}
              />
              {dispBarWidth > 40 && (
                <span className="relative z-10 px-1 text-[8px] font-medium text-foreground/70 truncate pointer-events-none">{step.step_name}</span>
              )}
              {/* Resize handles */}
              {stepStart && stepEnd && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/sbar:opacity-100 bg-foreground/20 rounded-l-sm z-20"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setStepDrag({ edge: 'left', startX: e.clientX, origStart: step.start_date!, origEnd: step.due_date! }); }}
                  />
                  <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover/sbar:opacity-100 bg-foreground/20 rounded-r-sm z-20"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setStepDrag({ edge: 'right', startX: e.clientX, origStart: step.start_date!, origEnd: step.due_date! }); }}
                  />
                </>
              )}
            </div>
          ) : !stepDrawing && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/srow:opacity-100 transition-opacity pointer-events-none">
              <span className="text-[8px] text-muted-foreground/50 italic">Drag to set dates</span>
            </div>
          )}
        </div>
      </div>

      {/* Child step rows */}
      {childSteps.map(child => (
        <div key={child.id} className="flex group/crow" onDoubleClick={e => onDoubleClickStep(child, [], e)}>
          <div className="shrink-0 w-[220px] border-r border-border bg-card z-10 h-6 flex items-center pl-10 pr-2 border-b border-border/20 gap-1">
            <DragGrip onReorder={(dir) => onReorderChild(child, childSteps, dir)} />
            <button onClick={() => onToggleChild(child, childSteps, step)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
              <div className={cn(
                "h-2.5 w-2.5 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                child.complete ? "bg-ops-green/15 border-ops-green/40" : "border-border",
              )}>
                {child.complete && <Check className="h-1.5 w-1.5 text-ops-green" />}
              </div>
              <span className={cn("text-[9px] truncate", child.complete ? "text-muted-foreground line-through" : "text-foreground/80")}>{child.step_name}</span>
            </button>
            {canDelete && (
              <button onClick={() => onDelete(child)} className="p-0.5 opacity-0 group-hover/crow:opacity-100 text-muted-foreground hover:text-accent transition-all">
                <Trash2 className="h-2 w-2" />
              </button>
            )}
          </div>
          <div className="flex-1 h-6 border-b border-border/20" />
        </div>
      ))}
    </>
  );
};

// ── GanttStepPopover (double-click a sub-task row) ─────────────────────────

const GanttStepPopover = ({
  step,
  childSteps,
  x,
  y,
  onClose,
  onSave,
  onDelete,
  canDelete,
}: {
  step: TaskStepRow;
  childSteps: TaskStepRow[];
  x: number;
  y: number;
  onClose: () => void;
  onSave: (updates: { id: string; step_name?: string; start_date?: string | null; due_date?: string | null; complete?: boolean; status?: string; assigned_to?: string | null }) => Promise<void>;
  onDelete: (step: TaskStepRow) => void;
  canDelete: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    step_name: step.step_name,
    start_date: step.start_date ?? '',
    due_date: step.due_date ?? '',
    complete: step.complete,
    status: step.status ?? 'Not Started',
    assigned_to: step.assigned_to ?? '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const style = useMemo(() => {
    const w = 280, h = 440;
    let left = x + 8;
    let top = y - h / 2;
    if (typeof window !== 'undefined') {
      if (left + w > window.innerWidth - 12) left = x - w - 8;
      if (top < 12) top = 12;
      if (top + h > window.innerHeight - 12) top = window.innerHeight - h - 12;
    }
    return { left, top };
  }, [x, y]);

  const completedChildren = childSteps.filter(c => c.complete).length;
  const progress = childSteps.length > 0
    ? Math.round((completedChildren / childSteps.length) * 100)
    : form.complete ? 100 : 0;
  const duration = form.start_date && form.due_date
    ? differenceInDays(new Date(form.due_date), new Date(form.start_date)) + 1
    : null;

  // Sync complete flag with status
  const handleStatusChange = (status: string) => {
    setForm(p => ({
      ...p,
      status,
      complete: status === 'Complete',
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        id: step.id,
        step_name: form.step_name.trim(),
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        complete: form.complete,
        status: form.status,
        assigned_to: form.assigned_to.trim() || null,
      });
      onClose();
    } catch (err) { console.error('[GanttView]', err); /* parent handles toast */ }
    setSaving(false);
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[280px] rounded-lg border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left: style.left, top: style.top }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sub-task</p>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Name */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Name</label>
          <input
            type="text"
            value={form.step_name}
            onChange={e => setForm(p => ({ ...p, step_name: e.target.value }))}
            className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring mt-0.5"
          />
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">Progress</span>
            <span className="text-[10px] font-mono text-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-ops-green transition-all" style={{ width: `${progress}%` }} />
          </div>
          {childSteps.length > 0 && (
            <p className="text-[9px] text-muted-foreground mt-1">{completedChildren}/{childSteps.length} items complete</p>
          )}
          {duration !== null && (
            <p className="text-[9px] text-muted-foreground mt-0.5">{duration} day{duration !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Status</label>
          <div className="flex gap-1 mt-1">
            {STEP_STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={cn(
                  "flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-all",
                  form.status === opt.value
                    ? cn(opt.activeColor, "text-background")
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assigned To */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Assigned To</label>
          <input
            type="text"
            value={form.assigned_to}
            onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
            placeholder="email or name"
            className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring mt-0.5"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Start</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Due</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.step_name.trim()}
            className="flex-1 flex items-center justify-center gap-1 rounded bg-accent px-2.5 py-1.5 text-[11px] font-medium text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
          {canDelete && (
            <button
              onClick={() => { onDelete(step); onClose(); }}
              className="p-1.5 rounded border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
              title="Delete sub-task"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── GanttTaskRow (expandable task with sub-tasks) ──────────────────────────

const GanttTaskRow = ({
  task,
  timelineStart,
  timelineDays,
  todayOffset,
  isSelected,
  onSelect,
  onDeleteTask,
  onDoubleClickBar,
  onDoubleClickStep,
  statusColor,
  statusProgressColor,
  onDragStart,
  onDrawStart,
  drawingRange,
  canDelete,
}: {
  task: TaskRow;
  timelineStart: Date;
  timelineDays: Date[];
  todayOffset: number;
  isSelected: boolean;
  onSelect: (task: TaskRow) => void;
  onDeleteTask: (task: TaskRow) => void;
  onDoubleClickBar: (task: TaskRow, e: React.MouseEvent) => void;
  onDoubleClickStep: (step: TaskStepRow, children: TaskStepRow[], e: React.MouseEvent) => void;
  statusColor: (s: string) => string;
  statusProgressColor: (s: string) => string;
  onDragStart: (task: TaskRow, edge: 'left' | 'right' | 'move', e: React.MouseEvent) => void;
  onDrawStart: (task: TaskRow, colIndex: number, e: React.MouseEvent) => void;
  drawingRange: { startCol: number; endCol: number } | null;
  canDelete: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { data: steps = [] } = useTaskSteps(expanded ? task.id : undefined);
  const updateStep = useUpdateTaskStep();
  const updateSteps = useUpdateTaskSteps();
  const updateTask = useUpdateTask();
  const createStep = useCreateTaskStep();
  const deleteStep = useDeleteTaskStep();
  const reorderSteps = useReorderTaskSteps();

  const [addingStepName, setAddingStepName] = useState('');
  const [showAddStep, setShowAddStep] = useState(false);
  const [addingChildForId, setAddingChildForId] = useState<string | null>(null);
  const [childName, setChildName] = useState('');

  const parentSteps = useMemo(() => steps.filter(s => !s.parent_step_id).sort((a, b) => a.sort_order - b.sort_order), [steps]);
  const childrenMap = useMemo(() => {
    const map = new Map<string, TaskStepRow[]>();
    steps.filter(s => s.parent_step_id).forEach(s => {
      const list = map.get(s.parent_step_id!) ?? [];
      list.push(s);
      map.set(s.parent_step_id!, list);
    });
    map.forEach(list => list.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [steps]);

  // Reorder parent steps
  const handleReorderParent = async (step: TaskStepRow, direction: 'up' | 'down') => {
    const idx = parentSteps.findIndex(s => s.id === step.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= parentSteps.length) return;
    const target = parentSteps[targetIdx];
    try {
      await reorderSteps.mutateAsync([
        { id: step.id, sort_order: target.sort_order, task_id: task.id },
        { id: target.id, sort_order: step.sort_order, task_id: task.id },
      ]);
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to reorder'); }
  };

  // Reorder child steps
  const handleReorderChild = async (child: TaskStepRow, siblings: TaskStepRow[], direction: 'up' | 'down') => {
    const idx = siblings.findIndex(s => s.id === child.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const target = siblings[targetIdx];
    try {
      await reorderSteps.mutateAsync([
        { id: child.id, sort_order: target.sort_order, task_id: task.id },
        { id: target.id, sort_order: child.sort_order, task_id: task.id },
      ]);
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to reorder'); }
  };

  // Update step dates
  const handleUpdateStepDates = async (stepId: string, startDate: string, dueDate: string) => {
    try {
      await updateStep.mutateAsync({ id: stepId, start_date: startDate, due_date: dueDate });
      toast.success('Step dates updated');
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update step dates'); }
  };

  const rebalanceWeights = async (parents: { id: string; complete: boolean }[]) => {
    if (parents.length === 0) return;
    const newWeight = +(1 / parents.length).toFixed(6);
    await updateSteps.mutateAsync(parents.map(s => ({ id: s.id, weight: newWeight })));
    const newProgress = parents.reduce((sum, s) => sum + (s.complete ? newWeight : 0), 0);
    await updateTask.mutateAsync({ id: task.id, progress: newProgress });
  };

  const handleToggleStep = async (step: TaskStepRow) => {
    const children = childrenMap.get(step.id) ?? [];
    if (children.length > 0) return;
    const newComplete = !step.complete;
    try {
      await updateStep.mutateAsync({ id: step.id, complete: newComplete });
      const weight = parentSteps.length > 0 ? +(1 / parentSteps.length).toFixed(6) : 0;
      const newProgress = parentSteps.reduce((sum, p) => {
        const isC = p.id === step.id ? newComplete : (childrenMap.get(p.id) ?? []).length > 0 ? (childrenMap.get(p.id) ?? []).every(c => c.complete) : p.complete;
        return sum + (isC ? weight : 0);
      }, 0);
      await updateTask.mutateAsync({ id: task.id, progress: newProgress });
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update'); }
  };

  const handleToggleChild = async (child: TaskStepRow, siblings: TaskStepRow[], parent: TaskStepRow) => {
    const newComplete = !child.complete;
    try {
      await updateStep.mutateAsync({ id: child.id, complete: newComplete });
      const allChildrenComplete = siblings.every(c => c.id === child.id ? newComplete : c.complete);
      if (allChildrenComplete !== parent.complete) {
        await updateStep.mutateAsync({ id: parent.id, complete: allChildrenComplete });
      }
      const weight = parentSteps.length > 0 ? +(1 / parentSteps.length).toFixed(6) : 0;
      const newProgress = parentSteps.reduce((sum, p) => {
        let isC: boolean;
        if (p.id === parent.id) isC = allChildrenComplete;
        else { const pc = childrenMap.get(p.id) ?? []; isC = pc.length > 0 ? pc.every(c => c.complete) : p.complete; }
        return sum + (isC ? weight : 0);
      }, 0);
      await updateTask.mutateAsync({ id: task.id, progress: newProgress });
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update'); }
  };

  const handleDeleteStep = async (stepToDelete: TaskStepRow) => {
    try {
      await deleteStep.mutateAsync({ id: stepToDelete.id, task_id: task.id });
      if (!stepToDelete.parent_step_id) {
        const remaining = parentSteps.filter(s => s.id !== stepToDelete.id);
        if (remaining.length > 0) await rebalanceWeights(remaining);
        else await updateTask.mutateAsync({ id: task.id, progress: 0 });
      }
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to remove'); }
  };

  const handleAddStep = async () => {
    if (!addingStepName.trim()) return;
    try {
      const created = await createStep.mutateAsync({ task_id: task.id, step_name: addingStepName.trim(), weight: 0, sort_order: parentSteps.length, parent_step_id: null });
      await rebalanceWeights([...parentSteps, created]);
      setAddingStepName('');
      setShowAddStep(false);
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to add'); }
  };

  const handleAddChild = async (parentId: string) => {
    if (!childName.trim()) return;
    try {
      const siblings = childrenMap.get(parentId) ?? [];
      await createStep.mutateAsync({ task_id: task.id, step_name: childName.trim(), weight: 0, sort_order: siblings.length, parent_step_id: parentId });
      setChildName('');
      setAddingChildForId(null);
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to add'); }
  };

  // Quick status change
  const handleQuickStatus = async (status: string) => {
    if (status === task.status) return;
    try {
      await updateTask.mutateAsync({ id: task.id, status });
      toast.success(`${task.task_name} → ${status}`);
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update status'); }
  };

  // Bar calculations
  const taskStart = task.start_date ? startOfDay(new Date(task.start_date)) : null;
  const taskEnd = task.due_date ? startOfDay(new Date(task.due_date)) : null;
  let barLeft = 0, barWidth = 0, showBar = false;
  if (taskStart && taskEnd) {
    barLeft = differenceInDays(taskStart, timelineStart) * DAY_WIDTH;
    barWidth = (differenceInDays(taskEnd, taskStart) + 1) * DAY_WIDTH;
    showBar = true;
  } else if (taskStart) {
    barLeft = differenceInDays(taskStart, timelineStart) * DAY_WIDTH;
    barWidth = DAY_WIDTH;
    showBar = true;
  } else if (taskEnd) {
    barLeft = differenceInDays(taskEnd, timelineStart) * DAY_WIDTH;
    barWidth = DAY_WIDTH;
    showBar = true;
  }
  const progress = Number(task.progress);

  // Drawing preview
  const drawLeft = drawingRange ? Math.min(drawingRange.startCol, drawingRange.endCol) * DAY_WIDTH : 0;
  const drawWidth = drawingRange ? (Math.abs(drawingRange.endCol - drawingRange.startCol) + 1) * DAY_WIDTH : 0;

  // Calculate col from mouse position on timeline
  const getColFromEvent = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(timelineDays.length - 1, Math.floor(x / DAY_WIDTH)));
  };

  return (
    <>
      {/* Main task row */}
      <div className="flex group/taskrow">
        {/* Left label */}
        <div
          className={cn("shrink-0 w-[220px] border-r border-border bg-card z-10 h-9 flex items-center px-2 border-b border-border/50 gap-1 transition-colors",
            isSelected ? "bg-accent/10" : "hover:bg-muted/30"
          )}
        >
          <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-muted-foreground/60 hover:text-muted-foreground shrink-0">
            <ChevronDown className={cn("h-3 w-3 transition-transform", !expanded && "-rotate-90")} />
          </button>

          {/* Status quick-action pills (visible on hover) */}
          <div className="hidden group-hover/taskrow:flex items-center gap-0.5 shrink-0">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleQuickStatus(opt.value)}
                title={opt.value}
                className={cn(
                  "h-4 w-5 rounded text-[7px] font-bold flex items-center justify-center transition-all",
                  task.status === opt.value
                    ? cn(opt.activeColor, "text-background")
                    : cn(opt.color, "text-foreground/60 hover:opacity-100 opacity-60"),
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Status dot (hidden on hover, shown normally) */}
          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0 group-hover/taskrow:hidden", statusColor(task.status))} />

          <button onClick={() => onSelect(task)} className="min-w-0 flex-1 text-left">
            <p className="text-[11px] font-medium text-foreground truncate leading-tight">{task.task_name}</p>
            <p className="text-[9px] text-muted-foreground truncate leading-tight">
              {task.assigned_to ? task.assigned_to.split('@')[0] : '—'}
            </p>
          </button>
          {canDelete && (
            <button
              onClick={() => onDeleteTask(task)}
              className="p-0.5 shrink-0 rounded opacity-0 group-hover/taskrow:opacity-100 text-muted-foreground hover:text-accent transition-all"
              title="Delete task"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Right timeline bar */}
        <div
          className={cn("flex-1 h-9 relative border-b border-border/50", isSelected && "bg-accent/5", !showBar && "cursor-crosshair")}
          onMouseDown={!showBar ? (e) => {
            const col = getColFromEvent(e);
            onDrawStart(task, col, e);
          } : undefined}
        >
          {/* Weekend shading */}
          {timelineDays.map((day, i) => {
            if (day.getDay() !== 0 && day.getDay() !== 6) return null;
            return <div key={i} className="absolute top-0 bottom-0 bg-muted/20" style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }} />;
          })}

          {/* Drawing preview highlight */}
          {drawingRange && !showBar && (
            <div
              className="absolute top-1.5 h-6 rounded-sm bg-accent/20 border border-accent/40 pointer-events-none z-20"
              style={{ left: drawLeft, width: drawWidth }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-accent">
                {Math.abs(drawingRange.endCol - drawingRange.startCol) + 1}d
              </span>
            </div>
          )}

          {showBar ? (
            <div
              className="absolute top-2 h-5 flex items-center group/bar cursor-grab active:cursor-grabbing"
              style={{ left: barLeft, width: barWidth }}
              onMouseDown={e => {
                // Middle of bar → move. Don't start if clicking edge handles.
                if (taskStart && taskEnd) {
                  e.preventDefault();
                  onDragStart(task, 'move', e);
                }
              }}
              onDoubleClick={e => { e.stopPropagation(); onDoubleClickBar(task, e); }}
            >
              <div className={cn("absolute inset-0 rounded-sm opacity-25", statusColor(task.status))} />
              <div className={cn("absolute top-0 bottom-0 left-0 rounded-sm", statusProgressColor(task.status))} style={{ width: `${Math.min(progress * 100, 100)}%` }} />
              {barWidth > 60 && (
                <span className="relative z-10 px-2 text-[9px] font-medium text-background truncate pointer-events-none">{task.task_name}</span>
              )}
              {/* Left resize handle */}
              {taskStart && taskEnd && (
                <>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-foreground/20 rounded-l-sm z-20"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onDragStart(task, 'left', e); }}
                  />
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-foreground/20 rounded-r-sm z-20"
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onDragStart(task, 'right', e); }}
                  />
                </>
              )}
            </div>
          ) : !drawingRange && (
            /* No dates hint: show "drag to assign" text on hover */
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/taskrow:opacity-100 transition-opacity pointer-events-none">
              <span className="text-[9px] text-muted-foreground/60 italic">Click & drag to set dates</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded sub-tasks */}
      {expanded && (
        <>
          {parentSteps.map(step => (
            <GanttStepRow
              key={step.id}
              step={step}
              children={childrenMap.get(step.id) ?? []}
              allParents={parentSteps}
              timelineStart={timelineStart}
              timelineDays={timelineDays}
              todayOffset={todayOffset}
              onToggle={handleToggleStep}
              onToggleChild={handleToggleChild}
              onDelete={handleDeleteStep}
              onAddChild={(parentId) => { setAddingChildForId(parentId); setChildName(''); }}
              onReorder={handleReorderParent}
              onReorderChild={handleReorderChild}
              onUpdateStepDates={handleUpdateStepDates}
              onDoubleClickStep={onDoubleClickStep}
              canDelete={canDelete}
            />
          ))}

          {/* Add child inline input */}
          {addingChildForId && (
            <div className="flex">
              <div className="shrink-0 w-[220px] border-r border-border bg-card z-10 h-7 flex items-center pl-12 pr-2 border-b border-border/20 gap-1">
                <input
                  type="text" value={childName} onChange={e => setChildName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddChild(addingChildForId); if (e.key === 'Escape') setAddingChildForId(null); }}
                  placeholder="Item name..." autoFocus
                  className="flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button onClick={() => handleAddChild(addingChildForId)} disabled={!childName.trim()} className="text-[9px] font-medium text-accent hover:underline disabled:opacity-50">Add</button>
                <button onClick={() => setAddingChildForId(null)} className="text-muted-foreground hover:text-foreground"><X className="h-2.5 w-2.5" /></button>
              </div>
              <div className="flex-1 h-7 border-b border-border/20" />
            </div>
          )}

          {/* Add top-level step */}
          <div className="flex">
            <div className="shrink-0 w-[220px] border-r border-border bg-card z-10 h-7 flex items-center pl-7 pr-2 border-b border-border/30">
              {showAddStep ? (
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text" value={addingStepName} onChange={e => setAddingStepName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddStep(); if (e.key === 'Escape') setShowAddStep(false); }}
                    placeholder="Sub-task..." autoFocus
                    className="flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-ring min-w-0"
                  />
                  <button onClick={handleAddStep} disabled={!addingStepName.trim()} className="text-[9px] font-medium text-accent hover:underline disabled:opacity-50">Add</button>
                  <button onClick={() => { setShowAddStep(false); setAddingStepName(''); }} className="text-muted-foreground hover:text-foreground"><X className="h-2.5 w-2.5" /></button>
                </div>
              ) : (
                <button onClick={() => setShowAddStep(true)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-2.5 w-2.5" /> Add sub-task
                </button>
              )}
            </div>
            <div className="flex-1 h-7 border-b border-border/30" />
          </div>
        </>
      )}
    </>
  );
};

// ── GanttEditPanel (right sidebar) ─────────────────────────────────────────

const GanttEditPanel = ({ task, onClose, onDeleteTask, canDelete }: { task: TaskRow; onClose: () => void; onDeleteTask: (task: TaskRow) => void; canDelete: boolean }) => {
  const updateTask = useUpdateTask();
  const [form, setForm] = useState({
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

  // Reset form when task changes
  useMemo(() => {
    setForm({
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
  }, [task.id]);

  const handleSave = async () => {
    if (!form.task_name.trim()) return;
    try {
      await updateTask.mutateAsync({
        id: task.id,
        task_name: form.task_name.trim(),
        phase: form.phase,
        priority: form.priority,
        status: form.status,
        assigned_to: form.assigned_to.trim() || null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        blocked_reason: form.status === 'Blocked' ? (form.blocked_reason.trim() || null) : null,
        notes: form.notes.trim() || null,
      });
      toast.success('Task updated');
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update task'); }
  };

  return (
    <div className="w-[300px] shrink-0 border-l border-border bg-card overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Edit Task</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <Label className="text-[10px]">Task Name</Label>
          <Input value={form.task_name} onChange={e => setForm(p => ({ ...p, task_name: e.target.value }))} className="h-8 text-xs" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Phase</Label>
            <Select value={form.phase} onValueChange={v => setForm(p => ({ ...p, phase: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PHASE_ORDER.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px]">Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{['Low', 'Medium', 'High', 'Critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Status</Label>
          <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{['Not Started', 'In Progress', 'Blocked', 'Complete'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {form.status === 'Blocked' && (
          <div>
            <Label className="text-[10px]">Blocked Reason</Label>
            <Input value={form.blocked_reason} onChange={e => setForm(p => ({ ...p, blocked_reason: e.target.value }))} className="h-8 text-xs" placeholder="Why blocked?" />
          </div>
        )}
        <div>
          <Label className="text-[10px]">Assigned To</Label>
          <Input value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="h-8 text-xs" placeholder="email" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Start</Label>
            <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px]">Due</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className="h-8 text-xs" />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Notes</Label>
          <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="text-xs" placeholder="Notes..." />
        </div>
        <Button onClick={handleSave} disabled={updateTask.isPending || !form.task_name.trim()} className="w-full h-8 text-xs">
          {updateTask.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Save
        </Button>
        {canDelete && (
          <button
            onClick={() => onDeleteTask(task)}
            className="w-full flex items-center justify-center gap-1.5 rounded border border-accent/30 bg-accent/5 px-3 py-1.5 text-[11px] font-medium text-accent hover:bg-accent/10 transition-colors mt-2"
          >
            <Trash2 className="h-3 w-3" />
            Delete Task
          </button>
        )}
      </div>
    </div>
  );
};

// ── GanttBarPopover (double-click a bar to quick-edit) ─────────────────────

const GanttBarPopover = ({
  task,
  x,
  y,
  onClose,
  onSave,
  onDeleteTask,
}: {
  task: TaskRow;
  x: number;
  y: number;
  onClose: () => void;
  onSave: (updates: Partial<TaskRow> & { id: string }) => Promise<void>;
  onDeleteTask: (task: TaskRow) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    start_date: task.start_date ?? '',
    due_date: task.due_date ?? '',
    status: task.status,
    assigned_to: task.assigned_to ?? '',
    notes: task.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Clamp position so the popover stays on screen
  const style = useMemo(() => {
    const w = 280, h = 400;
    let left = x + 8;
    let top = y - h / 2;
    if (typeof window !== 'undefined') {
      if (left + w > window.innerWidth - 12) left = x - w - 8;
      if (top < 12) top = 12;
      if (top + h > window.innerHeight - 12) top = window.innerHeight - h - 12;
    }
    return { left, top };
  }, [x, y]);

  const progress = Math.round(Number(task.progress) * 100);
  const duration = task.start_date && task.due_date
    ? differenceInDays(new Date(task.due_date), new Date(task.start_date)) + 1
    : null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        id: task.id,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
        status: form.status,
        assigned_to: form.assigned_to.trim() || null,
        notes: form.notes.trim() || null,
      });
      onClose();
    } catch (err) { console.error('[GanttView]', err); /* parent handles toast */ }
    setSaving(false);
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 w-[280px] rounded-lg border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-100"
      style={{ left: style.left, top: style.top }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{task.task_name}</p>
          <p className="text-[10px] text-muted-foreground">{task.phase} · {task.priority}</p>
        </div>
        <button onClick={onClose} className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">Progress</span>
            <span className="text-[10px] font-mono text-foreground">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          {duration !== null && (
            <p className="text-[9px] text-muted-foreground mt-1">{duration} day{duration !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Start</label>
            <input
              type="date"
              value={form.start_date}
              onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground">Due</label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Status</label>
          <div className="flex gap-1 mt-1">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                className={cn(
                  "flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-all",
                  form.status === opt.value
                    ? cn(opt.activeColor, "text-background")
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {opt.value === 'Not Started' ? 'Not Started' : opt.value === 'In Progress' ? 'In Progress' : opt.value}
              </button>
            ))}
          </div>
        </div>

        {/* Assigned To */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Assigned To</label>
          <input
            type="text"
            value={form.assigned_to}
            onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))}
            placeholder="email or name"
            className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring mt-0.5"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            rows={2}
            placeholder="Add notes..."
            className="w-full rounded border border-input bg-background px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring resize-none mt-0.5"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1 rounded bg-accent px-2.5 py-1.5 text-[11px] font-medium text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
          <button
            onClick={() => { onDeleteTask(task); onClose(); }}
            className="p-1.5 rounded border border-accent/30 text-accent hover:bg-accent/10 transition-colors"
            title="Delete task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main GanttView Component ───────────────────────────────────────────────

export interface GanttViewProps {
  tasks: TaskRow[];
}

export const GanttView = ({ tasks }: GanttViewProps) => {
  const today = startOfDay(new Date());
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { can } = useRole();
  const canDelete = can('delete_records');

  const { timelineStart, timelineDays } = useMemo(() => {
    const datesWithValues = tasks.flatMap(t => {
      const dates: Date[] = [];
      if (t.start_date) dates.push(startOfDay(new Date(t.start_date)));
      if (t.due_date) dates.push(startOfDay(new Date(t.due_date)));
      return dates;
    });

    if (datesWithValues.length === 0) {
      const start = addDays(today, -7);
      const end = addDays(today, 21);
      return { timelineStart: start, timelineDays: eachDayOfInterval({ start, end }) };
    }

    const minDate = datesWithValues.reduce((a, b) => (a < b ? a : b));
    const maxDate = datesWithValues.reduce((a, b) => (a > b ? a : b));
    const start = addDays(minDate, -3);
    const end = addDays(maxDate, 7);
    return { timelineStart: start, timelineDays: eachDayOfInterval({ start, end }) };
  }, [tasks, today]);

  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    let current = '';
    let count = 0;
    timelineDays.forEach(day => {
      const label = format(day, 'MMM yyyy');
      if (label === current) { count++; } else { if (current) groups.push({ label: current, span: count }); current = label; count = 1; }
    });
    if (current) groups.push({ label: current, span: count });
    return groups;
  }, [timelineDays]);

  const todayOffset = differenceInDays(today, timelineStart);

  const phaseGroups = useMemo(() => {
    const groups: { phase: string; label: string; tasks: TaskRow[] }[] = [];
    PHASE_ORDER.forEach(phase => {
      const phaseTasks = tasks.filter(t => t.phase === phase);
      if (phaseTasks.length > 0) groups.push({ phase, label: phaseLabels[phase] ?? phase, tasks: phaseTasks });
    });
    const unphased = tasks.filter(t => !t.phase || !PHASE_ORDER.includes(t.phase as typeof PHASE_ORDER[number]));
    if (unphased.length > 0) groups.push({ phase: 'Other', label: 'Unassigned Phase', tasks: unphased });
    return groups;
  }, [tasks]);

  const statusColor = (status: string) => {
    switch (status) { case 'Complete': return 'bg-ops-green'; case 'In Progress': return 'bg-blue-500'; case 'Blocked': return 'bg-accent'; default: return 'bg-muted-foreground/40'; }
  };
  const statusProgressColor = (status: string) => {
    switch (status) { case 'Complete': return 'bg-ops-green'; case 'In Progress': return 'bg-blue-500/70'; case 'Blocked': return 'bg-accent/70'; default: return 'bg-muted-foreground/30'; }
  };

  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);

  const handleDeleteTask = useCallback(async (task: TaskRow) => {
    try {
      await deleteTask.mutateAsync({ id: task.id, version_id: task.version_id! });
      toast.success(`Deleted "${task.task_name}"`);
      setSelectedTask(prev => prev?.id === task.id ? null : prev);
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to delete task'); }
  }, [deleteTask]);

  // ── Bar popover (double-click a bar to edit inline) ────────────
  const [popover, setPopover] = useState<{ task: TaskRow; clientX: number; clientY: number } | null>(null);

  const handleDoubleClickBar = useCallback((task: TaskRow, e: React.MouseEvent) => {
    setDragging(null);
    setStepPopover(null);
    setPopover({ task, clientX: e.clientX, clientY: e.clientY });
  }, []);

  // ── Step popover (double-click a sub-task row) ────────────
  const [stepPopover, setStepPopover] = useState<{ step: TaskStepRow; children: TaskStepRow[]; clientX: number; clientY: number } | null>(null);
  const updateStepForPopover = useUpdateTaskStep();

  const handleDoubleClickStep = useCallback((step: TaskStepRow, children: TaskStepRow[], e: React.MouseEvent) => {
    setPopover(null);
    setStepPopover({ step, children, clientX: e.clientX, clientY: e.clientY });
  }, []);

  const handleStepPopoverSave = useCallback(async (updates: { id: string; step_name?: string; start_date?: string | null; due_date?: string | null; complete?: boolean; status?: string; assigned_to?: string | null }) => {
    try {
      await updateStepForPopover.mutateAsync(updates);
      toast.success('Sub-task updated');
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update sub-task'); throw new Error(); }
  }, [updateStepForPopover]);

  const deleteStepForPopover = useDeleteTaskStep();
  const handleStepPopoverDelete = useCallback(async (step: TaskStepRow) => {
    try {
      await deleteStepForPopover.mutateAsync({ id: step.id, task_id: step.task_id });
      toast.success('Sub-task deleted');
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to delete sub-task'); }
  }, [deleteStepForPopover]);

  // ── Drag (resize/move existing bar) ─────────────────────
  const [dragging, setDragging] = useState<{
    task: TaskRow; edge: 'left' | 'right' | 'move'; startX: number; startY: number;
    origStart: string; origEnd: string; moved: boolean;
    _newStart?: string; _newEnd?: string;
  } | null>(null);

  const handleDragStart = useCallback((task: TaskRow, edge: 'left' | 'right' | 'move', e: React.MouseEvent) => {
    e.preventDefault();
    if (!task.start_date || !task.due_date) return;
    setPopover(null);
    setDragging({ task, edge, startX: e.clientX, startY: e.clientY, origStart: task.start_date, origEnd: task.due_date, moved: false });
  }, []);

  // ── Draw (paint new bar for tasks without dates) ────────
  const [drawing, setDrawing] = useState<{
    task: TaskRow; startCol: number; endCol: number; clientY: number;
  } | null>(null);

  const handleDrawStart = useCallback((task: TaskRow, colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setPopover(null);
    setDrawing({ task, startCol: colIndex, endCol: colIndex, clientY: e.clientY });
  }, []);

  // ── Unified mouse handlers ──────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Handle bar drag
    if (dragging) {
      const dx = e.clientX - dragging.startX;
      const daysDelta = Math.round(dx / DAY_WIDTH);

      const origStart = startOfDay(new Date(dragging.origStart));
      const origEnd = startOfDay(new Date(dragging.origEnd));
      let newStart = origStart;
      let newEnd = origEnd;

      if (dragging.edge === 'left') {
        newStart = addDays(origStart, daysDelta);
        if (newStart > newEnd) newStart = newEnd;
      } else if (dragging.edge === 'right') {
        newEnd = addDays(origEnd, daysDelta);
        if (newEnd < newStart) newEnd = newStart;
      } else {
        newStart = addDays(origStart, daysDelta);
        newEnd = addDays(origEnd, daysDelta);
      }

      const hasMoved = daysDelta !== 0;
      setDragging(prev => prev ? {
        ...prev,
        moved: prev.moved || hasMoved,
        _newStart: format(newStart, 'yyyy-MM-dd'),
        _newEnd: format(newEnd, 'yyyy-MM-dd'),
      } : null);
      return;
    }

    // Handle drawing
    if (drawing) {
      // Find the timeline body area and calculate column
      const timelineEl = document.querySelector('[data-timeline-body]');
      if (!timelineEl) return;
      const rect = timelineEl.getBoundingClientRect();
      // Offset by the 220px left label column
      const x = e.clientX - rect.left - 220;
      const col = Math.max(0, Math.min(timelineDays.length - 1, Math.floor(x / DAY_WIDTH)));
      setDrawing(prev => prev ? { ...prev, endCol: col } : null);
    }
  }, [dragging, drawing, timelineDays.length]);

  const handleMouseUp = useCallback(async () => {
    // Handle bar drag end
    if (dragging) {
      const newStartStr = dragging._newStart ?? dragging.origStart;
      const newEndStr = dragging._newEnd ?? dragging.origEnd;

      if (!dragging.moved) {
        // No movement → single click — no-op (double-click opens popover)
      } else if (newStartStr !== dragging.origStart || newEndStr !== dragging.origEnd) {
        try {
          await updateTask.mutateAsync({ id: dragging.task.id, start_date: newStartStr, due_date: newEndStr });
          toast.success(`${dragging.task.task_name}: ${format(new Date(newStartStr), 'MMM d')} → ${format(new Date(newEndStr), 'MMM d')}`);
        } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update dates'); }
      }
      setDragging(null);
      return;
    }

    // Handle drawing end
    if (drawing) {
      const startCol = Math.min(drawing.startCol, drawing.endCol);
      const endCol = Math.max(drawing.startCol, drawing.endCol);
      const startDate = timelineDays[startCol];
      const endDate = timelineDays[endCol];
      const drawTask = drawing.task;
      const drawClientY = drawing.clientY;

      if (startDate && endDate) {
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');
        try {
          await updateTask.mutateAsync({ id: drawTask.id, start_date: startStr, due_date: endStr });
          toast.success(`${drawTask.task_name}: ${format(startDate, 'MMM d')} → ${format(endDate, 'MMM d')}`);
          // Open popover for the freshly-drawn task
          setPopover({
            task: { ...drawTask, start_date: startStr, due_date: endStr },
            clientX: (Math.min(startCol, endCol) * DAY_WIDTH) + 220,
            clientY: drawClientY,
          });
        } catch (err) { console.error('[GanttView]', err); toast.error('Failed to set dates'); }
      }
      setDrawing(null);
    }
  }, [dragging, drawing, updateTask, timelineDays]);

  const handlePopoverSave = useCallback(async (updates: Partial<TaskRow> & { id: string }) => {
    try {
      await updateTask.mutateAsync(updates);
      toast.success('Task updated');
    } catch (err) { console.error('[GanttView]', err); toast.error('Failed to update task'); throw new Error(); }
  }, [updateTask]);

  const isInteracting = !!dragging || !!drawing;

  return (
    <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="kpi-card p-0 overflow-hidden">
      <div className="flex" onMouseMove={isInteracting ? handleMouseMove : undefined} onMouseUp={isInteracting ? handleMouseUp : undefined} onMouseLeave={isInteracting ? handleMouseUp : undefined}>
        {/* Left labels + Right timeline (combined rows) */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex">
            {/* Left header */}
            <div className="shrink-0 w-[220px] border-r border-border bg-card z-10 h-[52px] border-b border-border px-3 flex items-end pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Task</span>
            </div>
            {/* Right header */}
            <div className="flex-1 overflow-x-auto" id="gantt-timeline-header">
              <div style={{ width: timelineDays.length * DAY_WIDTH, minWidth: '100%' }}>
                <div className="flex h-6 border-b border-border">
                  {monthGroups.map((m, i) => (
                    <div key={i} style={{ width: m.span * DAY_WIDTH }} className="flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/30 last:border-r-0">
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="flex h-[26px] border-b border-border">
                  {timelineDays.map((day, i) => {
                    const isToday = isSameDay(day, today);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div key={i} style={{ width: DAY_WIDTH }} className={cn(
                        "flex flex-col items-center justify-center text-[9px] border-r border-border/20 shrink-0",
                        isToday && "bg-accent/10 font-bold text-accent",
                        isWeekend && !isToday && "text-muted-foreground/40",
                        !isToday && !isWeekend && "text-muted-foreground",
                      )}>
                        <span>{format(day, 'd')}</span>
                        <span className="text-[8px] leading-none">{format(day, 'EEE').slice(0, 2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Task rows area */}
          <div className="flex-1 overflow-y-auto" data-timeline-body>
            {/* Today line */}
            <div className="relative pointer-events-none" style={{ height: 0 }}>
              <div className="absolute" style={{ left: 220 }}>
                {todayOffset >= 0 && todayOffset < timelineDays.length && (
                  <div className="absolute w-px border-l border-dashed border-accent/50 z-10" style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2, top: 0, height: 9999 }} />
                )}
              </div>
            </div>

            {phaseGroups.map(group => (
              <div key={group.phase}>
                {/* Phase header */}
                <div className="flex">
                  <div className="shrink-0 w-[220px] border-r border-border bg-card z-10 h-7 flex items-center px-3 bg-muted/30 border-b border-border">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                  </div>
                  <div className="flex-1 h-7 bg-muted/30 border-b border-border" />
                </div>

                {group.tasks.map(task => (
                  <GanttTaskRow
                    key={task.id}
                    task={task}
                    timelineStart={timelineStart}
                    timelineDays={timelineDays}
                    todayOffset={todayOffset}
                    isSelected={selectedTask?.id === task.id}
                    onSelect={setSelectedTask}
                    onDeleteTask={handleDeleteTask}
                    onDoubleClickBar={handleDoubleClickBar}
                    onDoubleClickStep={handleDoubleClickStep}
                    statusColor={statusColor}
                    statusProgressColor={statusProgressColor}
                    onDragStart={handleDragStart}
                    onDrawStart={handleDrawStart}
                    drawingRange={drawing && drawing.task.id === task.id ? { startCol: drawing.startCol, endCol: drawing.endCol } : null}
                    canDelete={canDelete}
                  />
                ))}
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="flex">
                <div className="shrink-0 w-[220px] border-r border-border bg-card z-10 px-3 py-6 text-xs text-muted-foreground text-center">No tasks</div>
                <div className="flex-1" />
              </div>
            )}
          </div>
        </div>

        {/* Edit Panel */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <GanttEditPanel task={selectedTask} onClose={() => setSelectedTask(null)} onDeleteTask={handleDeleteTask} canDelete={canDelete} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>

    {/* Bar popover (double-click a bar → inline edit card) — rendered outside motion.div to avoid overflow clip */}
    {popover && (
      <GanttBarPopover
        task={popover.task}
        x={popover.clientX}
        y={popover.clientY}
        onClose={() => setPopover(null)}
        onSave={handlePopoverSave}
        onDeleteTask={handleDeleteTask}
      />
    )}

    {/* Step popover (double-click a sub-task row) */}
    {stepPopover && (
      <GanttStepPopover
        step={stepPopover.step}
        childSteps={stepPopover.children}
        x={stepPopover.clientX}
        y={stepPopover.clientY}
        onClose={() => setStepPopover(null)}
        onSave={handleStepPopoverSave}
        onDelete={handleStepPopoverDelete}
        canDelete={canDelete}
      />
    )}
    </>
  );
};
