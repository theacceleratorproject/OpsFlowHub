import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useShortageAlerts, useCreatePartRequest } from '@/hooks/use-supabase-data';
import type { ShortageAlert } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, ChevronDown, Plus, Loader2, Wrench, Clock } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ── Shortage Card ──────────────────────────────────────────────────────────

const ShortageCard = ({
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

// ── Main page ──────────────────────────────────────────────────────────────

const ShortageAlerts = () => {
  const { selectedProject, selectedVersion } = useProject();
  const { user } = useAuth();
  const userEmail = user?.email ?? '';
  const versionId = selectedVersion?.id;

  const { data: alerts = [], isLoading } = useShortageAlerts(versionId);
  const createRequest = useCreatePartRequest();

  const [dialogAlert, setDialogAlert] = useState<ShortageAlert | null>(null);
  const [reqQty, setReqQty] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [urgency, setUrgency] = useState<'Standard' | 'Expedite' | 'Critical'>('Expedite');

  // Derived stats for banner
  const affectedWoIds = useMemo(() => {
    const ids = new Set<string>();
    alerts.forEach(a => a.affected_work_orders.forEach(wo => ids.add(wo.id)));
    return ids;
  }, [alerts]);

  const zeroStockCount = useMemo(() => alerts.filter(a => a.on_hand === 0).length, [alerts]);

  if (!selectedProject || !selectedVersion) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const openDialog = (alert: ShortageAlert) => {
    setDialogAlert(alert);
    setReqQty(String(alert.shortfall));
    setNeededBy('');
    setUrgency(alert.on_hand === 0 ? 'Critical' : 'Expedite');
  };

  const handleCreate = async () => {
    if (!dialogAlert || !neededBy) return;
    try {
      await createRequest.mutateAsync({
        project_id: selectedProject.id,
        version_id: selectedVersion.id,
        part_number: dialogAlert.part_number,
        requested_qty: Number(reqQty),
        requested_by: userEmail,
        needed_by_date: neededBy,
        urgency,
      });
      toast.success(`Part request created for ${dialogAlert.part_number}`);
      setDialogAlert(null);
    } catch {
      toast.error('Failed to create part request');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 text-accent" /> Shortage Alerts
        </h2>
        <p className="text-xs text-muted-foreground">
          {selectedProject.project_name} — {selectedVersion.version_name}
        </p>
      </div>

      {/* Risk Banner */}
      {alerts.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-md border px-4 py-3",
            zeroStockCount > 0
              ? "border-accent/30 bg-accent/5"
              : "border-ops-amber/30 bg-ops-amber/5",
          )}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                zeroStockCount > 0 ? "bg-accent" : "bg-ops-amber",
              )} />
              <span className={cn(
                "text-sm font-semibold",
                zeroStockCount > 0 ? "text-accent" : "text-ops-amber",
              )}>
                {alerts.length} shortage{alerts.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {affectedWoIds.size} work order{affectedWoIds.size !== 1 ? 's' : ''} at risk
            </span>
            {zeroStockCount > 0 && (
              <span className="text-xs font-semibold text-accent">
                {zeroStockCount} at zero stock
              </span>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-md border border-ops-green/30 bg-ops-green/5 px-4 py-3"
        >
          <span className="text-sm font-semibold text-ops-green">
            No shortages — all parts adequately stocked
          </span>
        </motion.div>
      )}

      {/* Shortage Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert, i) => (
          <ShortageCard
            key={alert.part_number}
            alert={alert}
            index={i}
            onCreateRequest={openDialog}
          />
        ))}
      </div>

      {/* Create Part Request Dialog */}
      <Dialog open={!!dialogAlert} onOpenChange={open => { if (!open) setDialogAlert(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Part Request</DialogTitle>
          </DialogHeader>
          {dialogAlert && (
            <div className="space-y-3 pt-2">
              <div className="rounded border border-border px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{dialogAlert.part_name}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{dialogAlert.part_number}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {dialogAlert.on_hand} on hand · {dialogAlert.required} required · {dialogAlert.shortfall} short
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={reqQty}
                    onChange={e => setReqQty(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Urgency</Label>
                  <Select value={urgency} onValueChange={v => setUrgency(v as typeof urgency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Standard', 'Expedite', 'Critical'].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Needed By *</Label>
                <Input type="date" value={neededBy} onChange={e => setNeededBy(e.target.value)} />
              </div>
              {dialogAlert.supplier_name && (
                <p className="text-[10px] text-muted-foreground">
                  Supplier: {dialogAlert.supplier_name}
                  {dialogAlert.lead_time_days != null && ` · ${dialogAlert.lead_time_days} day lead time`}
                </p>
              )}
              <Button
                onClick={handleCreate}
                disabled={createRequest.isPending || !neededBy || Number(reqQty) <= 0}
                className="w-full"
              >
                {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Request
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShortageAlerts;
