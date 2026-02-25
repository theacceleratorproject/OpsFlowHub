import { useProject } from '@/contexts/ProjectContext';
import { usePartRequests, useCreatePartRequest, useUpdatePartRequest, useCreatePickingOrder, useCreateIssue } from '@/hooks/use-supabase-data';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Urgency = 'Standard' | 'Expedite' | 'Critical';

const PartRequests = () => {
  const { selectedProject, selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const { data: requests = [], isLoading } = usePartRequests(versionId);
  const createRequest = useCreatePartRequest();
  const updateRequest = useUpdatePartRequest();
  const createPickingOrder = useCreatePickingOrder();
  const createIssue = useCreateIssue();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; part_number: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Form state
  const [partNumber, setPartNumber] = useState('');
  const [requestedQty, setRequestedQty] = useState('');
  const [neededByDate, setNeededByDate] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('Standard');

  if (!selectedProject || !selectedVersion) return null;

  const resetForm = () => {
    setPartNumber('');
    setRequestedQty('');
    setNeededByDate('');
    setUrgency('Standard');
    setShowForm(false);
  };

  const handleSubmitClick = () => {
    if (!partNumber.trim() || !requestedQty || !neededByDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (Number(requestedQty) <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      await createRequest.mutateAsync({
        project_id: selectedProject.id,
        version_id: selectedVersion.id,
        part_number: partNumber.trim(),
        requested_qty: Number(requestedQty),
        requested_by: 'current.user@opspulse.io',
        needed_by_date: neededByDate,
        urgency,
      });
      setShowConfirm(false);
      resetForm();
      toast.success('Part request submitted successfully');
    } catch {
      toast.error('Failed to submit request');
    }
  };

  const handleApprove = async (id: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    try {
      await updateRequest.mutateAsync({ id, status: 'Approved', approved_by: 'current.user@opspulse.io', approval_date: new Date().toISOString() });
      await createPickingOrder.mutateAsync({
        project_id: selectedProject.id,
        version_id: selectedVersion.id,
        work_order_number: `REQ-${id.slice(0, 8)}`,
        part_number: request.part_number,
        pick_qty: request.requested_qty,
      });
      queryClient.invalidateQueries({ queryKey: ['picking_orders', selectedVersion.id] });
      toast.success('Request approved — picking order created');
    } catch {
      toast.error('Failed to approve request');
    }
  };

  const openRejectDialog = (id: string) => {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    setRejectTarget({ id, part_number: request.part_number });
    setRejectionReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget || !rejectionReason.trim()) return;
    try {
      await updateRequest.mutateAsync({
        id: rejectTarget.id,
        status: 'Rejected',
        rejection_reason: rejectionReason.trim(),
      });
      await createIssue.mutateAsync({
        project_id: selectedProject.id,
        version_id: selectedVersion.id,
        related_module: 'PartRequest',
        related_record_id: rejectTarget.id,
        issue_description: `Part request rejected: ${rejectTarget.part_number} — ${rejectionReason.trim()}`,
        raised_by: 'current.user@opspulse.io',
        priority: 'Medium',
        status: 'Open',
      });
      queryClient.invalidateQueries({ queryKey: ['issues', selectedVersion.id] });
      toast.success('Request rejected — issue created');
      setRejectTarget(null);
    } catch {
      toast.error('Failed to reject request');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRequests = requests.filter(r => r.status !== 'Rejected');
  const rejectedRequests = requests.filter(r => r.status === 'Rejected');

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" /> Part Requests
          </h2>
          <p className="text-xs text-muted-foreground">{requests.length} requests</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <Plus className="h-3.5 w-3.5" />
          New Request
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-md border border-border bg-card p-5 space-y-4"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Part Request</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Part Number *</Label>
              <Input value={partNumber} onChange={e => setPartNumber(e.target.value)} placeholder="e.g. TB-4420-A" className="text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Quantity *</Label>
              <Input type="number" min="1" value={requestedQty} onChange={e => setRequestedQty(e.target.value)} placeholder="Enter quantity" className="text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Needed By *</Label>
              <Input type="date" value={neededByDate} onChange={e => setNeededByDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="text-xs h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Urgency</Label>
              <Select value={urgency} onValueChange={v => setUrgency(v as Urgency)}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Expedite">Expedite</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSubmitClick} className="rounded bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90">
              Submit Request
            </button>
            <button onClick={resetForm} className="rounded border border-border px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Part Request</AlertDialogTitle>
            <AlertDialogDescription>Please verify the details below.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded border border-border bg-muted/30 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Part Number</span>
              <span className="font-mono font-medium text-foreground">{partNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-mono font-medium text-foreground">{requestedQty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Needed By</span>
              <span className="font-medium text-foreground">{neededByDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Urgency</span>
              <span className={cn("font-semibold uppercase",
                urgency === 'Critical' && "text-accent",
                urgency === 'Expedite' && "text-foreground",
                urgency === 'Standard' && "text-muted-foreground",
              )}>{urgency}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>Confirm & Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">ID</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Part</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Qty</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Urgency</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Needed By</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Requested By</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeRequests.map(req => (
                <tr key={req.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{req.id.slice(0, 8)}</td>
                  <td className="px-3 py-2.5 font-mono font-medium text-foreground">{req.part_number}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{req.requested_qty}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider",
                      req.urgency === 'Critical' && "text-accent",
                      req.urgency === 'Expedite' && "text-foreground",
                      req.urgency === 'Standard' && "text-muted-foreground",
                    )}>{req.urgency}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider",
                      req.status === 'Pending' && "text-ops-amber",
                      req.status === 'Received' && "text-ops-green",
                      (req.status === 'Approved' || req.status === 'Ordered') && "text-foreground",
                    )}>{req.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{req.needed_by_date ? new Date(req.needed_by_date).toLocaleDateString() : '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{req.requested_by ? req.requested_by.split('@')[0] : '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    {req.status === 'Pending' && (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={updateRequest.isPending || createPickingOrder.isPending}
                          className="rounded bg-ops-green/15 px-2.5 py-1 text-[10px] font-semibold text-ops-green transition-colors hover:bg-ops-green/25 disabled:opacity-50"
                        >Approve</button>
                        <button
                          onClick={() => openRejectDialog(req.id)}
                          disabled={updateRequest.isPending || createIssue.isPending}
                          className="rounded bg-accent/15 px-2.5 py-1 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
                        >Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {activeRequests.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {rejectedRequests.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rejected</h3>
          {rejectedRequests.map(r => (
            <div key={r.id} className="rounded border border-accent/15 bg-accent/5 p-2.5 text-xs text-foreground">
              <span className="font-mono text-muted-foreground">{r.id.slice(0, 8)}</span> — {r.rejection_reason ?? 'No reason provided'}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) setRejectTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Part Request</DialogTitle>
            <DialogDescription>
              Rejecting <span className="font-mono font-semibold">{rejectTarget?.part_number}</span>. An issue will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Rejection Reason *</Label>
              <Textarea
                placeholder="e.g. Part discontinued, incorrect specification, budget constraints..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={3}
                autoFocus
              />
            </div>
            <Button
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim() || updateRequest.isPending || createIssue.isPending}
              variant="destructive"
              className="w-full"
            >
              {(updateRequest.isPending || createIssue.isPending) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject & Create Issue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PartRequests;
