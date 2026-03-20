import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useShortageAlerts, useCreatePartRequest } from '@/hooks/use-supabase-data';
import type { ShortageAlert } from '@/hooks/use-supabase-data';
import { motion } from 'framer-motion';
import { AlertOctagon, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ShortageCard } from '@/components/shortages/ShortageCard';

// ── Main page ──────────────────────────────────────────────────────────────

const ShortageAlerts = () => {
  const { selectedProject, selectedVersion } = useProject();
  const { user } = useAuth();
  const userEmail = user?.email ?? '';
  const versionId = selectedVersion?.id;

  const { data: alerts = [], isLoading, isError } = useShortageAlerts(versionId);
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

  if (isError) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-accent" /> Shortage Alerts
          </h2>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load data. Please refresh.</AlertDescription>
        </Alert>
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
    } catch (err) {
      console.error('[ShortageAlerts]', err);
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
