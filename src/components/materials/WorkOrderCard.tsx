import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useWorkOrderLines, type WorkOrderRow } from '@/hooks/use-supabase-data';

export const WorkOrderCard = ({
  wo,
  expanded,
  onToggle,
  onStatusChange,
}: {
  wo: WorkOrderRow;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
}) => {
  const { data: lines = [], isLoading } = useWorkOrderLines(expanded ? wo.id : undefined);

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div
        onClick={onToggle}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          }
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-medium text-foreground">WO# {wo.work_order_number}</span>
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                wo.status === 'Open' && "text-muted-foreground",
                wo.status === 'In Progress' && "text-foreground",
                wo.status === 'Completed' && "text-ops-green",
                wo.status === 'Cancelled' && "text-accent",
              )}>
                {wo.status}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {wo.mode === 'from_bom' ? 'BOM' : 'Custom'}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Created {new Date(wo.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {wo.status === 'Open' && (
            <button onClick={() => onStatusChange('In Progress')} className="text-[10px] font-medium text-foreground hover:underline px-1">Start</button>
          )}
          {wo.status === 'In Progress' && (
            <button onClick={() => onStatusChange('Completed')} className="text-[10px] font-medium text-ops-green hover:underline px-1">Complete</button>
          )}
          {wo.status !== 'Cancelled' && wo.status !== 'Completed' && (
            <button onClick={() => onStatusChange('Cancelled')} className="text-[10px] font-medium text-accent hover:underline px-1">Cancel</button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Part Number</th>
                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Qty</th>
                      <th className="px-3 py-2 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map(line => (
                      <tr key={line.id} className="data-table-row">
                        <td className="px-3 py-2 font-mono font-medium text-foreground">{line.part_number}</td>
                        <td className="px-3 py-2 text-foreground">{line.description ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-foreground">{Number(line.required_qty)}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{line.unit_of_measure ?? 'EA'}</td>
                      </tr>
                    ))}
                    {lines.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">No lines</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
