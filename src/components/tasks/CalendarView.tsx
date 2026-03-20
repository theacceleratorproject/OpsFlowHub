import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { differenceInDays, addDays, startOfDay, format, eachDayOfInterval, isWithinInterval, isSameDay } from 'date-fns';
import type { TaskRow } from '@/hooks/use-supabase-data';

export interface CalendarViewProps {
  tasks: TaskRow[];
  selectedDate: Date | undefined;
  onSelectDate: (d: Date | undefined) => void;
}

export const CalendarView = ({ tasks, selectedDate, onSelectDate }: CalendarViewProps) => {
  // Build modifiers for date ranges
  const { startEndDates, inRangeDates } = useMemo(() => {
    const startEnd = new Set<string>();
    const inRange = new Set<string>();
    tasks.forEach(t => {
      const s = t.start_date ? startOfDay(new Date(t.start_date)) : null;
      const e = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      if (s) startEnd.add(format(s, 'yyyy-MM-dd'));
      if (e) startEnd.add(format(e, 'yyyy-MM-dd'));
      if (s && e && differenceInDays(e, s) > 1) {
        const midStart = addDays(s, 1);
        const midEnd = addDays(e, -1);
        if (midStart <= midEnd) {
          eachDayOfInterval({ start: midStart, end: midEnd }).forEach(d => {
            inRange.add(format(d, 'yyyy-MM-dd'));
          });
        }
      }
    });
    return {
      startEndDates: Array.from(startEnd).map(d => new Date(d + 'T00:00:00')),
      inRangeDates: Array.from(inRange).map(d => new Date(d + 'T00:00:00')),
    };
  }, [tasks]);

  // Find tasks that span the selected date
  const tasksForSelected = useMemo(() => {
    if (!selectedDate) return [];
    const sel = startOfDay(selectedDate);
    return tasks.filter(t => {
      const s = t.start_date ? startOfDay(new Date(t.start_date)) : null;
      const e = t.due_date ? startOfDay(new Date(t.due_date)) : null;
      if (s && e) return isWithinInterval(sel, { start: s, end: e });
      if (s) return isSameDay(sel, s);
      if (e) return isSameDay(sel, e);
      return false;
    });
  }, [selectedDate, tasks]);

  const modifiers = useMemo(() => ({
    startEnd: startEndDates,
    inRange: inRangeDates,
  }), [startEndDates, inRangeDates]);

  const modifiersStyles = {
    startEnd: {
      fontWeight: 700,
      textDecoration: 'underline',
      textDecorationColor: 'hsl(349 80% 45%)',
      textUnderlineOffset: '3px',
    },
    inRange: {
      backgroundColor: 'hsl(349 80% 45% / 0.12)',
      borderRadius: '0',
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
              <span>
                {task.start_date ? format(new Date(task.start_date), 'MMM d') : '—'}
                {' → '}
                {task.due_date ? format(new Date(task.due_date), 'MMM d') : '—'}
              </span>
              <span className="font-mono">{Math.round(Number(task.progress) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
