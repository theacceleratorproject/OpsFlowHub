import { useProject } from '@/contexts/ProjectContext';
import { usePickingOrders, useCreatePickingOrder, useUpdatePickingOrder, useCreateIssue } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Truck, Plus, Loader2, AlertTriangle, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const PickingOrders = () => {
  const { selectedProject, selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const { data: picks = [], isLoading } = usePickingOrders(versionId);
  const createPick = useCreatePickingOrder();
  const updatePick = useUpdatePickingOrder();
  const createIssue = useCreateIssue();

  const [showCreate, setShowCreate] = useState(false);
  const [newPick, setNewPick] = useState({
    work_order_number: '', part_number: '', pick_qty: '', bin_location: '', assigned_picker: '',
  });
  const [pickConfirm, setPickConfirm] = useState<{ id: string; part_number: string; pick_qty: number } | null>(null);
  const [pickedQtyInput, setPickedQtyInput] = useState('');
  const [shortageNote, setShortageNote] = useState('');

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
      if (status === 'Verified') {
        updates.verified_by = 'current.user@opspulse.io';
      }
      await updatePick.mutateAsync(updates as { id: string } & Record<string, unknown>);

      // When verifying a pick with a shortage, auto-create an issue
      if (status === 'Verified') {
        const pick = picks.find(p => p.id === id);
        if (pick && pick.picked_qty && pick.picked_qty < pick.pick_qty) {
          const shortage = pick.pick_qty - pick.picked_qty;
          await createIssue.mutateAsync({
            project_id: selectedProject.id,
            version_id: selectedVersion.id,
            related_module: 'PickingOrder',
            related_record_id: id,
            issue_description: `Picking shortage: ${pick.part_number} — needed ${pick.pick_qty}, only ${pick.picked_qty} picked (${shortage} short).${pick.issue_note ? ` Note: ${pick.issue_note.replace(/^Short \d+ — /, '')}` : ''}`,
            raised_by: 'current.user@opspulse.io',
            priority: shortage >= 10 ? 'High' : 'Medium',
            status: 'Open',
          });
          toast.warning(`Shortage issue created: ${shortage} unit(s) short on ${pick.part_number}`);
          return;
        }
      }

      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const openPickConfirm = (id: string) => {
    const pick = picks.find(p => p.id === id);
    if (!pick) return;
    setPickConfirm({ id, part_number: pick.part_number, pick_qty: pick.pick_qty });
    setPickedQtyInput(String(pick.pick_qty));
    setShortageNote('');
  };

  const handlePickConfirm = async () => {
    if (!pickConfirm) return;
    const qty = Number(pickedQtyInput);
    if (isNaN(qty) || qty < 0 || qty > pickConfirm.pick_qty) return;
    const isShort = qty < pickConfirm.pick_qty;
    if (isShort && !shortageNote.trim()) return;
    try {
      const shortage = pickConfirm.pick_qty - qty;
      const note = isShort ? `Short ${shortage} — ${shortageNote.trim()}` : null;
      await updatePick.mutateAsync({
        id: pickConfirm.id,
        status: 'Picked',
        picked_qty: qty,
        picked_date_time: new Date().toISOString(),
        issue_note: note,
      } as { id: string } & Record<string, unknown>);
      if (isShort) {
        toast.warning(`Partial pick: ${qty}/${pickConfirm.pick_qty} — shortage noted`);
      } else {
        toast.success('Picked in full');
      }
      setPickConfirm(null);
    } catch {
      toast.error('Failed to update pick');
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
              {picks.filter(p => !p.work_order_number?.startsWith('REQ-')).map(pick => (
                <tr key={pick.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{pick.id.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{pick.work_order_number ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-foreground">{pick.part_number}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{pick.pick_qty}</td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {pick.picked_qty ? (
                      <span className={cn(
                        pick.picked_qty < pick.pick_qty ? "text-ops-amber" : "text-ops-green"
                      )}>
                        {pick.picked_qty}
                        {pick.picked_qty < pick.pick_qty && (
                          <span className="ml-1 text-[9px]" title={pick.issue_note ?? 'Shortage'}>!</span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
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
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {pick.status === 'Pending' && (
                        <button onClick={() => handleStatusUpdate(pick.id, 'In Progress')} className="rounded bg-foreground/10 px-2.5 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-foreground/20">Start</button>
                      )}
                      {pick.status === 'In Progress' && (
                        <>
                          <button onClick={() => openPickConfirm(pick.id)} className="rounded bg-ops-green/15 px-2.5 py-1 text-[10px] font-semibold text-ops-green transition-colors hover:bg-ops-green/25">Picked</button>
                          <button onClick={() => handleFlagIssue(pick.id)} className="rounded bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/25">Issue</button>
                        </>
                      )}
                      {pick.status === 'Picked' && (
                        <button onClick={() => handleStatusUpdate(pick.id, 'Verified')} className="rounded bg-ops-green/15 px-2.5 py-1 text-[10px] font-semibold text-ops-green transition-colors hover:bg-ops-green/25">Verify</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {picks.filter(p => !p.work_order_number?.startsWith('REQ-')).length === 0 && (
                <tr><td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No picking orders</td></tr>
              )}
              {picks.some(p => p.work_order_number?.startsWith('REQ-')) && (
                <>
                  <tr>
                    <td colSpan={9} className="bg-muted/40 px-3 py-2 border-y border-border">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <ShoppingCart className="h-3 w-3" /> Part Request Picks
                      </span>
                    </td>
                  </tr>
                  {picks.filter(p => p.work_order_number?.startsWith('REQ-')).map(pick => (
                    <tr key={pick.id} className="data-table-row">
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{pick.id.slice(0, 8)}</td>
                      <td className="px-3 py-2.5 font-mono">
                        <span className="inline-flex items-center rounded border border-ops-amber/30 px-1.5 py-0.5 text-[10px] font-mono font-medium text-ops-amber">
                          {pick.work_order_number}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-medium text-foreground">{pick.part_number}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">{pick.pick_qty}</td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {pick.picked_qty != null ? (
                          <span className={cn(
                            pick.picked_qty < pick.pick_qty ? "text-ops-amber" : "text-ops-green"
                          )}>
                            {pick.picked_qty}
                            {pick.picked_qty < pick.pick_qty && (
                              <span className="ml-1 text-[9px]" title={pick.issue_note ?? 'Shortage'}>!</span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {pick.status === 'Pending' && (
                            <button onClick={() => handleStatusUpdate(pick.id, 'In Progress')} className="rounded bg-foreground/10 px-2.5 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-foreground/20">Start</button>
                          )}
                          {pick.status === 'In Progress' && (
                            <>
                              <button onClick={() => openPickConfirm(pick.id)} className="rounded bg-ops-green/15 px-2.5 py-1 text-[10px] font-semibold text-ops-green transition-colors hover:bg-ops-green/25">Picked</button>
                              <button onClick={() => handleFlagIssue(pick.id)} className="rounded bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/25">Issue</button>
                            </>
                          )}
                          {pick.status === 'Picked' && (
                            <button onClick={() => handleStatusUpdate(pick.id, 'Verified')} className="rounded bg-ops-green/15 px-2.5 py-1 text-[10px] font-semibold text-ops-green transition-colors hover:bg-ops-green/25">Verify</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {picks.some(p => p.status === 'Issue' || (p.picked_qty && p.picked_qty < p.pick_qty)) && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Issues & Shortages</h3>
          {picks.filter(p => p.status === 'Issue').map(p => (
            <div key={p.id} className="rounded border border-accent/15 bg-accent/5 p-2.5 text-xs text-foreground">
              <span className="font-mono text-muted-foreground">{p.id.slice(0, 8)}</span> · {p.part_number} at {p.bin_location ?? '—'} — {p.issue_note}
            </div>
          ))}
          {picks.filter(p => p.status !== 'Issue' && p.picked_qty && p.picked_qty < p.pick_qty).map(p => (
            <div key={p.id} className="rounded border border-amber-500/15 bg-amber-500/5 p-2.5 text-xs text-foreground flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <span className="font-mono text-muted-foreground">{p.id.slice(0, 8)}</span> · {p.part_number} — Needed {p.pick_qty}, picked {p.picked_qty}{p.issue_note ? ` — ${p.issue_note}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!pickConfirm} onOpenChange={open => { if (!open) setPickConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Pick</DialogTitle>
            <DialogDescription>
              Part <span className="font-mono font-semibold">{pickConfirm?.part_number}</span> — Requested qty: <span className="font-semibold">{pickConfirm?.pick_qty}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Qty Actually Picked *</Label>
              <Input
                type="number"
                min="0"
                max={pickConfirm?.pick_qty}
                value={pickedQtyInput}
                onChange={e => setPickedQtyInput(e.target.value)}
                autoFocus
              />
            </div>
            {pickConfirm && Number(pickedQtyInput) >= 0 && Number(pickedQtyInput) < pickConfirm.pick_qty && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                <div className="rounded bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Shortage of {pickConfirm.pick_qty - Number(pickedQtyInput)} unit(s) — please provide a note.
                </div>
                <div>
                  <Label>Shortage Note *</Label>
                  <Textarea
                    placeholder="e.g. Not in location, misplaced, damaged, only 2 available on shelf..."
                    value={shortageNote}
                    onChange={e => setShortageNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </motion.div>
            )}
            <Button
              onClick={handlePickConfirm}
              disabled={
                updatePick.isPending ||
                !pickedQtyInput ||
                Number(pickedQtyInput) < 0 ||
                Number(pickedQtyInput) > (pickConfirm?.pick_qty ?? 0) ||
                (Number(pickedQtyInput) < (pickConfirm?.pick_qty ?? 0) && !shortageNote.trim())
              }
              className="w-full"
            >
              {updatePick.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {pickConfirm && Number(pickedQtyInput) < pickConfirm.pick_qty ? 'Confirm Partial Pick' : 'Confirm Pick'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PickingOrders;
