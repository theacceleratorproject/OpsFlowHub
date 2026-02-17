import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIssues, useCreateIssue, useUpdateIssue, useStockIssues } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AlertTriangle, Plus, Loader2, PackageX } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const statusOrder = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;

const Issues = () => {
  const { selectedProject, selectedVersion } = useProject();
  const { isAdmin, canEdit, user } = useAuth();
  const versionId = selectedVersion?.id;
  const { data: issues = [], isLoading } = useIssues(versionId);
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();
  const { data: stockIssues = [] } = useStockIssues(versionId);

  const [showCreate, setShowCreate] = useState(false);
  const [newIssue, setNewIssue] = useState({
    issue_description: '', related_module: 'Other', priority: 'Medium', assigned_to: '', raised_by: '',
  });

  if (!selectedProject || !selectedVersion) return null;

  const handleCreate = async () => {
    if (!newIssue.issue_description.trim()) return;
    try {
      await createIssue.mutateAsync({
        project_id: selectedProject.id,
        version_id: selectedVersion.id,
        issue_description: newIssue.issue_description.trim(),
        related_module: newIssue.related_module,
        priority: newIssue.priority,
        assigned_to: newIssue.assigned_to.trim() || null,
        raised_by: newIssue.raised_by.trim() || (user?.email ?? ''),
      });
      toast.success('Issue created');
      setShowCreate(false);
      setNewIssue({ issue_description: '', related_module: 'Other', priority: 'Medium', assigned_to: '', raised_by: '' });
    } catch {
      toast.error('Failed to create issue');
    }
  };

  const handleResolve = async (id: string) => {
    const resolution = window.prompt('Resolution:');
    if (!resolution) return;
    try {
      await updateIssue.mutateAsync({ id, status: 'Resolved', resolution, resolved_date: new Date().toISOString() });
      toast.success('Issue resolved');
    } catch {
      toast.error('Failed to resolve issue');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await updateIssue.mutateAsync({ id, status: 'Closed' });
      toast.success('Issue closed');
    } catch {
      toast.error('Failed to close issue');
    }
  };

  const handleStartProgress = async (id: string) => {
    try {
      await updateIssue.mutateAsync({ id, status: 'In Progress' });
      toast.success('Issue moved to In Progress');
    } catch {
      toast.error('Failed to update issue');
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
            <AlertTriangle className="h-4 w-4 text-muted-foreground" /> Issues Log
          </h2>
          <p className="text-xs text-muted-foreground">{issues.length} issues</p>
        </div>
        {canEdit && (
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90">
              <Plus className="h-3.5 w-3.5" />
              New Issue
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Issue</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Description *</Label>
                <Textarea value={newIssue.issue_description} onChange={e => setNewIssue(p => ({ ...p, issue_description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Module</Label>
                  <Select value={newIssue.related_module} onValueChange={v => setNewIssue(p => ({ ...p, related_module: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Material', 'Task', 'PartRequest', 'PickingOrder', 'Other'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newIssue.priority} onValueChange={v => setNewIssue(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Low', 'Medium', 'High', 'Critical'].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Raised By</Label>
                  <Input value={newIssue.raised_by} onChange={e => setNewIssue(p => ({ ...p, raised_by: e.target.value }))} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Input value={newIssue.assigned_to} onChange={e => setNewIssue(p => ({ ...p, assigned_to: e.target.value }))} placeholder="email@example.com" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={createIssue.isPending || !newIssue.issue_description.trim()} className="w-full">
                {createIssue.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Issue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {statusOrder.map(status => {
        const filtered = issues.filter(i => i.status === status);
        if (filtered.length === 0) return null;
        return (
          <motion.div key={status} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {status} ({filtered.length})
            </h3>
            <div className="space-y-2">
              {filtered.map(issue => (
                <div key={issue.id} className="kpi-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] text-muted-foreground">{issue.id.slice(0, 8)}</span>
                    <span className={cn("text-[10px] font-semibold uppercase tracking-wider",
                      issue.priority === 'Critical' && "text-accent",
                      issue.priority === 'High' && "text-foreground",
                      issue.priority === 'Medium' && "text-muted-foreground",
                      issue.priority === 'Low' && "text-muted-foreground/60",
                    )}>{issue.priority}</span>
                    <span className="text-[10px] text-muted-foreground">· {issue.related_module ?? 'General'}</span>
                  </div>
                  <p className="text-xs text-foreground mb-2">{issue.issue_description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{issue.raised_by ? issue.raised_by.split('@')[0] : '—'}</span>
                    {issue.assigned_to && <span>→ {issue.assigned_to.split('@')[0]}</span>}
                    <span>{new Date(issue.raised_date).toLocaleDateString()}</span>
                  </div>
                  {issue.resolution && (
                    <div className="mt-2 text-[11px] text-muted-foreground border-t border-border pt-2">
                      Resolution: {issue.resolution}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    {issue.status === 'Open' && canEdit && (
                      <button onClick={() => handleStartProgress(issue.id)} className="text-[10px] font-medium text-foreground hover:underline">Start Progress</button>
                    )}
                    {(issue.status === 'Open' || issue.status === 'In Progress') && isAdmin && (
                      <button onClick={() => handleResolve(issue.id)} className="text-[10px] font-medium text-ops-green hover:underline">Resolve</button>
                    )}
                    {issue.status === 'Resolved' && isAdmin && (
                      <button onClick={() => handleClose(issue.id)} className="text-[10px] font-medium text-muted-foreground hover:underline">Close</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}

      {issues.length === 0 && (
        <div className="text-center py-10 text-xs text-muted-foreground">No issues logged</div>
      )}

      {/* Stock Issues Dashboard */}
      <div className="pt-4 border-t border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <PackageX className="h-4 w-4 text-muted-foreground" /> Stock Issues
        </h2>
        {stockIssues.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">No stock issues reported</div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">WO#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Part</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Qty Short</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Reported By</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stockIssues.map(si => (
                    <tr key={si.id} className="data-table-row bg-accent/5">
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{si.work_order_number ?? '—'}</td>
                      <td className="px-3 py-2.5 font-mono font-medium text-foreground">{si.part_number}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{si.part_description ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-accent font-semibold">{si.quantity_short}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{si.reported_by ? si.reported_by.split('@')[0] : '—'}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{new Date(si.issue_date).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{si.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Issues;
