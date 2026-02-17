import { useProject } from '@/contexts/ProjectContext';
import { usePickingOrders, useCreatePickingOrder, useUpdatePickingOrder } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Truck, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PickingOrders = () => {
  const { selectedProject, selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const { data: picks = [], isLoading } = usePickingOrders(versionId);
  const createPick = useCreatePickingOrder();
  const updatePick = useUpdatePickingOrder();

  const [showCreate, setShowCreate] = useState(false);
  const [newPick, setNewPick] = useState({
    work_order_number: '', part_number: '', pick_qty: '', bin_location: '', assigned_picker: '',
  });

  if (!selectedProject || !selectedVersion) return null;

  const handleCreate = async () => {
    if (!newPick.part_number.trim() || !newPick.pick_qty) return;
    try {
      await createPick.mutateAsync({
        project_id: selectedProject.id,
        version_id: selectedVersion.id,
        work_order_number: newPick.work_order_number.trim() || null,
        part_number: newPick.part_number.trim(),
        pick_qty: Number(newPick.pick_qty),
        bin_location: newPick.bin_location.trim() || null,
        assigned_picker: newPick.assigned_picker.trim() || null,
      });
      toast.success('Picking order created');
      setShowCreate(false);
      setNewPick({ work_order_number: '', part_number: '', pick_qty: '', bin_location: '', assigned_picker: '' });
    } catch {
      toast.error('Failed to create picking order');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const updates: Record<string, unknown> = { id, status };
      if (status === 'Picked') {
        const pick = picks.find(p => p.id === id);
        updates.picked_qty = pick?.pick_qty ?? 0;
        updates.picked_date_time = new Date().toISOString();
      }
      if (status === 'Verified') {
        updates.verified_by = 'current.user@opspulse.io';
      }
      await updatePick.mutateAsync(updates as { id: string } & Record<string, unknown>);
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleFlagIssue = async (id: string) => {
    const note = window.prompt('Issue note:');
    if (!note) return;
    try {
      await updatePick.mutateAsync({ id, status: 'Issue', issue_note: note });
      toast.success('Issue flagged');
    } catch {
      toast.error('Failed to flag issue');
    }
  };

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
            <Truck className="h-4 w-4 text-muted-foreground" /> Picking Orders
          </h2>
          <p className="text-xs text-muted-foreground">{picks.length} orders</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90">
              <Plus className="h-3.5 w-3.5" />
              New Pick
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Picking Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Part Number *</Label>
                <Input value={newPick.part_number} onChange={e => setNewPick(p => ({ ...p, part_number: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pick Qty *</Label>
                  <Input type="number" min="1" value={newPick.pick_qty} onChange={e => setNewPick(p => ({ ...p, pick_qty: e.target.value }))} />
                </div>
                <div>
                  <Label>Work Order</Label>
                  <Input value={newPick.work_order_number} onChange={e => setNewPick(p => ({ ...p, work_order_number: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bin Location</Label>
                  <Input value={newPick.bin_location} onChange={e => setNewPick(p => ({ ...p, bin_location: e.target.value }))} />
                </div>
                <div>
                  <Label>Assigned Picker</Label>
                  <Input value={newPick.assigned_picker} onChange={e => setNewPick(p => ({ ...p, assigned_picker: e.target.value }))} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createPick.isPending || !newPick.part_number.trim() || !newPick.pick_qty} className="w-full">
                {createPick.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Pick
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Pick ID</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Work Order</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Part</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Qty</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Picked</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Bin</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Picker</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {picks.map(pick => (
                <tr key={pick.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{pick.id.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{pick.work_order_number ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-foreground">{pick.part_number}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{pick.pick_qty}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{pick.picked_qty ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{pick.bin_location ?? '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{pick.assigned_picker ? pick.assigned_picker.split('@')[0] : '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider",
                      pick.status === 'Verified' && "text-ops-green",
                      pick.status === 'Picked' && "text-ops-green",
                      pick.status === 'In Progress' && "text-foreground",
                      pick.status === 'Pending' && "text-muted-foreground",
                      pick.status === 'Issue' && "text-accent",
                    )}>{pick.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {pick.status === 'Pending' && (
                        <button onClick={() => handleStatusUpdate(pick.id, 'In Progress')} className="text-[10px] font-medium text-foreground hover:underline">Start</button>
                      )}
                      {pick.status === 'In Progress' && (
                        <>
                          <button onClick={() => handleStatusUpdate(pick.id, 'Picked')} className="text-[10px] font-medium text-ops-green hover:underline">Picked</button>
                          <span className="text-muted-foreground">·</span>
                          <button onClick={() => handleFlagIssue(pick.id)} className="text-[10px] font-medium text-accent hover:underline">Issue</button>
                        </>
                      )}
                      {pick.status === 'Picked' && (
                        <button onClick={() => handleStatusUpdate(pick.id, 'Verified')} className="text-[10px] font-medium text-ops-green hover:underline">Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {picks.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No picking orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {picks.some(p => p.status === 'Issue') && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Issues</h3>
          {picks.filter(p => p.status === 'Issue').map(p => (
            <div key={p.id} className="rounded border border-accent/15 bg-accent/5 p-2.5 text-xs text-foreground">
              <span className="font-mono text-muted-foreground">{p.id.slice(0, 8)}</span> · {p.part_number} at {p.bin_location ?? '—'} — {p.issue_note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PickingOrders;
