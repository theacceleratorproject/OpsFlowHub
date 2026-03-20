import type { ShortageAlert } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronDown, Wrench, Clock } from 'lucide-react';
import { useState } from 'react';

export const ShortageCard = ({
  alert,
  index,
  onCreateRequest,
}: {
  alert: ShortageAlert;
  index: number;
  onCreateRequest: (alert: ShortageAlert) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const pct = alert.required > 0 ? Math.round((alert.on_hand / alert.required) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="kpi-card"
    >
      {/* Top row: part info + shortfall badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{alert.part_name}</p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{alert.part_number}</p>
        </div>
        <span className="shrink-0 rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
          {alert.shortfall} short
        </span>
      </div>

      {/* Mini bar: on-hand vs required */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{alert.on_hand} on hand</span>
          <span>{alert.required} required</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              pct >= 80 ? "bg-ops-green" : pct >= 40 ? "bg-ops-amber" : "bg-accent",
            )}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>

      {/* Supplier + lead time */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
        {alert.supplier_name && (
          <span className="truncate">{alert.supplier_name}</span>
        )}
        {alert.lead_time_days != null && (
          <span className="flex items-center gap-0.5 shrink-0">
            <Clock className="h-3 w-3" />
            {alert.lead_time_days}d lead
          </span>
        )}
        {!alert.supplier_name && !alert.lead_time_days && (
          <span className="italic">No supplier on file</span>
        )}
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCreateRequest(alert)}
          className="flex items-center gap-1 rounded bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/25"
        >
          <Plus className="h-3 w-3" />
          Request Parts
        </button>

        {alert.affected_work_orders.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 rounded bg-foreground/10 px-2.5 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-foreground/20"
          >
            <Wrench className="h-3 w-3" />
            {alert.affected_work_orders.length} WO{alert.affected_work_orders.length !== 1 ? 's' : ''}
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      {/* Expandable: affected work orders */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              {alert.affected_work_orders.map(wo => (
                <div key={wo.id} className="flex items-center justify-between rounded border border-border px-2.5 py-1.5">
                  <div>
                    <span className="text-[11px] font-mono font-medium text-foreground">{wo.work_order_number}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {new Date(wo.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-semibold uppercase tracking-wider",
                    wo.status === 'Open' && "text-ops-amber",
                    wo.status === 'In Progress' && "text-foreground",
                    wo.status === 'Complete' && "text-ops-green",
                  )}>
                    {wo.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
