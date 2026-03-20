import { cn } from '@/lib/utils';
import { ClipboardList, CalendarDays, BarChart3 } from 'lucide-react';

export type ViewMode = 'cards' | 'calendar' | 'gantt';

export interface TaskFiltersProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const TaskFilters = ({ viewMode, onViewModeChange }: TaskFiltersProps) => {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
      <button
        onClick={() => onViewModeChange('cards')}
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
        onClick={() => onViewModeChange('calendar')}
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
      <button
        onClick={() => onViewModeChange('gantt')}
        className={cn(
          "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[11px] font-medium transition-colors",
          viewMode === 'gantt'
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <BarChart3 className="h-3 w-3" />
        Gantt
      </button>
    </div>
  );
};
