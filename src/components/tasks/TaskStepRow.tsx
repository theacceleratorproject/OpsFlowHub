import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus, Loader2, Trash2, X, GripVertical } from 'lucide-react';
import { useState, useRef } from 'react';
import type { TaskStepRow as TaskStepRowType } from '@/hooks/use-supabase-data';
import { useRole } from '@/contexts/AuthContext';

// ── Drag Handle ────────────────────────────────────────────────────────────────

export const DragGrip = ({ onReorder }: { onReorder: (direction: 'up' | 'down') => void }) => {
  const startYRef = useRef(0);
  const firedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startYRef.current = e.clientY;
    firedRef.current = false;

    const handleMove = (ev: MouseEvent) => {
      if (firedRef.current) return;
      const dy = ev.clientY - startYRef.current;
      if (Math.abs(dy) > 20) {
        firedRef.current = true;
        onReorder(dy < 0 ? 'up' : 'down');
      }
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
      title="Drag to reorder"
    >
      <GripVertical className="h-3 w-3" />
    </div>
  );
};

// ── TaskStepRow Props ──────────────────────────────────────────────────────────

export interface TaskStepRowProps {
  step: TaskStepRowType;
  children: TaskStepRowType[];
  totalParents: number;
  onToggle: (step: TaskStepRowType) => void;
  onToggleChild: (child: TaskStepRowType, siblings: TaskStepRowType[], parent: TaskStepRowType) => void;
  onDelete: (step: TaskStepRowType) => void;
  onAddChild: (parentId: string) => void;
  onReorder: (step: TaskStepRowType, direction: 'up' | 'down') => void;
  onReorderChild: (child: TaskStepRowType, siblings: TaskStepRowType[], direction: 'up' | 'down') => void;
  addingChildId: string | null;
  setAddingChildId: (id: string | null) => void;
  newChildName: string;
  setNewChildName: (name: string) => void;
  isAddingChild: boolean;
}

// ── TaskStepRow Component (card-view step row with checkbox and edit) ───────

export const TaskStepRow = ({
  step,
  children,
  totalParents,
  onToggle,
  onToggleChild,
  onDelete,
  onAddChild,
  onReorder,
  onReorderChild,
  addingChildId,
  setAddingChildId,
  newChildName,
  setNewChildName,
  isAddingChild,
}: TaskStepRowProps) => {
  const { can } = useRole();
  const [expanded, setExpanded] = useState(false);
  const completedChildren = children.filter(c => c.complete).length;
  const isParentComplete = children.length > 0 ? completedChildren === children.length : step.complete;

  return (
    <div className="space-y-0.5">
      {/* Parent row */}
      <div className="flex items-center gap-1.5 text-[11px] py-0.5 rounded hover:bg-muted/30 transition-colors group/step">
        <DragGrip onReorder={(dir) => onReorder(step, dir)} />
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
        {can('delete_records') && (
          <button
            onClick={() => onDelete(step)}
            className="p-0.5 rounded opacity-0 group-hover/step:opacity-100 text-muted-foreground hover:text-accent transition-all"
            title="Remove"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
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
                  <DragGrip onReorder={(dir) => onReorderChild(child, children, dir)} />
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
                  {can('delete_records') && (
                    <button
                      onClick={() => onDelete(child)}
                      className="p-0.5 rounded opacity-0 group-hover/child:opacity-100 text-muted-foreground hover:text-accent transition-all"
                      title="Remove"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
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
