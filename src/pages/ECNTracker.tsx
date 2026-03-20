import { useProject } from '@/contexts/ProjectContext';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useECNs, useCreateECN, useUpdateECN, useBomLines } from '@/hooks/use-supabase-data';
import type { EcnNoticeRow } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  FileWarning, Plus, Loader2, Search, X, Check,
  FileText, AlertTriangle, Clock, CheckCircle2, ChevronsUpDown, AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  under_review: 'Under Review',
  approved: 'Approved',
  implemented: 'Implemented',
  rejected: 'Rejected',
};

const statusColor = (s: string) =>
  s === 'implemented' ? 'text-ops-green bg-ops-green/15'
  : s === 'approved' ? 'text-foreground bg-foreground/10'
  : s === 'under_review' ? 'text-ops-amber bg-ops-amber/15'
  : s === 'rejected' ? 'text-accent bg-accent/15'
  : 'text-muted-foreground bg-muted';

const priorityColor = (p: string) =>
  p === 'critical' ? 'text-accent bg-accent/15'
  : p === 'high' ? 'text-foreground bg-foreground/10'
  : 'text-muted-foreground bg-muted';

const daysOpen = (submittedAt: string | null) => {
  if (!submittedAt) return null;
  return Math.max(1, Math.ceil((Date.now() - new Date(submittedAt).getTime()) / 86_400_000));
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString() : '—';

// ── Detail Section helper ────────────────────────────────────────────────────

const DetailSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    <div className="text-xs text-foreground">{children}</div>
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────

const ECNTracker = () => {
  const { selectedProject, selectedVersion } = useProject();
  const { user } = useAuth();
  const { can } = useRole();
  const userEmail = user?.email ?? '';
  const versionId = selectedVersion?.id;

  const { data: ecns = [], isLoading, isError } = useECNs(versionId);
  const { data: bomLines = [] } = useBomLines(versionId);
  const createECN = useCreateECN();
  const updateECN = useUpdateECN();

  // UI state
  const [selectedEcn, setSelectedEcn] = useState<EcnNoticeRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'critical' | 'high' | 'normal'>('normal');
  const [newParts, setNewParts] = useState<string[]>([]);
  const [partsOpen, setPartsOpen] = useState(false);

  // Lifecycle action state
  const [rejectTarget, setRejectTarget] = useState<string | null>(null); // ECN id
  const [rejectionReason, setRejectionReason] = useState('');
  const [confirmImplement, setConfirmImplement] = useState<string | null>(null); // ECN id

  // ── Derived data ───────────────────────────────────────────────────────────

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = useMemo(() => ({
    total: ecns.length,
    pendingReview: ecns.filter(e => e.status === 'draft' || e.status === 'under_review').length,
    critical: ecns.filter(e => e.priority === 'critical').length,
    implementedThisMonth: ecns.filter(e =>
      e.status === 'implemented' && e.approved_at && new Date(e.approved_at) >= thisMonthStart
    ).length,
  }), [ecns, thisMonthStart]);

  const filtered = useMemo(() => {
    let result = ecns;
    if (statusFilter !== 'all') result = result.filter(e => e.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter(e => e.priority === priorityFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.ecn_number.toLowerCase().includes(q) || e.title.toLowerCase().includes(q)
      );
    }
    return result;
  }, [ecns, statusFilter, priorityFilter, searchQuery]);

  const autoEcnNumber = useMemo(() => {
    const year = now.getFullYear();
    const existing = ecns.filter(e => e.ecn_number.startsWith(`ECN-${year}`));
    const next = existing.length + 1;
    return `ECN-${year}-${String(next).padStart(3, '0')}`;
  }, [ecns, now]);

  // Unique BOM parts for multi-select
  const bomParts = useMemo(() => {
    const seen = new Set<string>();
    return bomLines
      .filter(l => l.bom_level >= 1)
      .filter(l => { if (seen.has(l.component_number)) return false; seen.add(l.component_number); return true; })
      .map(l => ({ number: l.component_number, desc: l.object_description }));
  }, [bomLines]);

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
            <FileWarning className="h-4 w-4 text-muted-foreground" /> ECN Tracker
          </h2>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load data. Please refresh.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Create handler ─────────────────────────────────────────────────────────

  const resetCreate = () => {
    setNewTitle('');
    setNewDesc('');
    setNewPriority('normal');
    setNewParts([]);
    setShowCreate(false);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createECN.mutateAsync({
        ecn_number: autoEcnNumber,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        priority: newPriority,
        status: 'draft',
        project_version_id: selectedVersion.id,
        submitted_by: userEmail,
        submitted_at: new Date().toISOString(),
        affected_bom_lines: newParts,
      });
      toast.success('ECN created');
      resetCreate();
    } catch (err) {
      console.error('[ECNTracker]', err);
      toast.error('Failed to create ECN');
    }
  };

  // ── Lifecycle action handlers ──────────────────────────────────────────────

  const handleSubmitForReview = async (ecn: EcnNoticeRow) => {
    try {
      await updateECN.mutateAsync({ id: ecn.id, status: 'under_review' });
      setSelectedEcn({ ...ecn, status: 'under_review' });
      toast.success('ECN submitted for review');
    } catch (err) {
      console.error('[ECNTracker]', err);
      toast.error('Failed to update ECN');
    }
  };

  const handleApprove = async (ecn: EcnNoticeRow) => {
    try {
      const now = new Date().toISOString();
      await updateECN.mutateAsync({ id: ecn.id, status: 'approved', approved_by: userEmail, approved_at: now });
      setSelectedEcn({ ...ecn, status: 'approved', approved_by: userEmail, approved_at: now });
      toast.success('ECN approved');
    } catch (err) {
      console.error('[ECNTracker]', err);
      toast.error('Failed to approve ECN');
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await updateECN.mutateAsync({ id: rejectTarget, status: 'rejected', reason: rejectionReason.trim() || null });
      if (selectedEcn?.id === rejectTarget) {
        setSelectedEcn({ ...selectedEcn, status: 'rejected', reason: rejectionReason.trim() || selectedEcn.reason });
      }
      toast.success('ECN rejected');
      setRejectTarget(null);
      setRejectionReason('');
    } catch (err) {
      console.error('[ECNTracker]', err);
      toast.error('Failed to reject ECN');
    }
  };

  const handleImplement = async () => {
    if (!confirmImplement) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateECN.mutateAsync({ id: confirmImplement, status: 'implemented', implementation_date: today });
      if (selectedEcn?.id === confirmImplement) {
        setSelectedEcn({ ...selectedEcn, status: 'implemented', implementation_date: today });
      }
      toast.success('ECN marked as implemented');
      setConfirmImplement(null);
    } catch (err) {
      console.error('[ECNTracker]', err);
      toast.error('Failed to update ECN');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const kpiItems = [
    { label: 'Total ECNs', value: stats.total, icon: FileText, color: 'text-foreground' },
    { label: 'Pending Review', value: stats.pendingReview, icon: Clock, color: 'text-ops-amber' },
    { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'text-accent' },
    { label: 'Implemented This Month', value: stats.implementedThisMonth, icon: CheckCircle2, color: 'text-ops-green' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-muted-foreground" /> ECN Tracker
          </h2>
          <p className="text-xs text-muted-foreground">
            {selectedProject.project_name} — {selectedVersion.version_name}
          </p>
        </div>
        {can('edit_bom') && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New ECN
          </button>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpiItems.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="kpi-card"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('h-3.5 w-3.5', kpi.color)} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </span>
              </div>
              <p className={cn('text-2xl font-bold', kpi.color)}>{kpi.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ECN # or title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Data Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">ECN #</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Title</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Priority</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Parts</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Submitted</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Days Open</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ecn => {
                const days = daysOpen(ecn.submitted_at);
                return (
                  <tr
                    key={ecn.id}
                    onClick={() => setSelectedEcn(ecn)}
                    className="data-table-row cursor-pointer"
                  >
                    <td className="px-3 py-2.5 font-mono font-medium text-foreground whitespace-nowrap">{ecn.ecn_number}</td>
                    <td className="px-3 py-2.5 text-foreground max-w-[280px] truncate">{ecn.title}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', statusColor(ecn.status))}>
                        {STATUS_LABELS[ecn.status] ?? ecn.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn('inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', priorityColor(ecn.priority))}>
                        {ecn.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">{ecn.affected_bom_lines?.length ?? 0}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(ecn.submitted_at)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{days ?? '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No ECNs match filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Detail Sheet (slide-over) */}
      <Sheet open={!!selectedEcn} onOpenChange={open => { if (!open) setSelectedEcn(null); }}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          {selectedEcn && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-sm">{selectedEcn.ecn_number}</SheetTitle>
                <SheetDescription className="text-sm font-medium text-foreground">{selectedEcn.title}</SheetDescription>
              </SheetHeader>

              <div className="flex items-center gap-2 mt-4">
                <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', statusColor(selectedEcn.status))}>
                  {STATUS_LABELS[selectedEcn.status] ?? selectedEcn.status}
                </span>
                <span className={cn('rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider', priorityColor(selectedEcn.priority))}>
                  {selectedEcn.priority}
                </span>
              </div>

              <div className="mt-6 space-y-5">
                {selectedEcn.description && (
                  <DetailSection label="Description">
                    <p className="whitespace-pre-wrap">{selectedEcn.description}</p>
                  </DetailSection>
                )}

                {selectedEcn.reason && (
                  <DetailSection label="Reason">
                    <p className="whitespace-pre-wrap">{selectedEcn.reason}</p>
                  </DetailSection>
                )}

                {selectedEcn.impact_summary && (
                  <DetailSection label="Impact Summary">
                    <p className="whitespace-pre-wrap">{selectedEcn.impact_summary}</p>
                  </DetailSection>
                )}

                <DetailSection label="Affected BOM Lines">
                  {selectedEcn.affected_bom_lines?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedEcn.affected_bom_lines.map(part => (
                        <span key={part} className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">
                          {part}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">None specified</span>
                  )}
                </DetailSection>

                <div className="grid grid-cols-2 gap-4">
                  <DetailSection label="Submitted By">
                    <p>{selectedEcn.submitted_by ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(selectedEcn.submitted_at)}</p>
                  </DetailSection>
                  <DetailSection label="Approved By">
                    {selectedEcn.approved_by ? (
                      <>
                        <p>{selectedEcn.approved_by}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDate(selectedEcn.approved_at)}</p>
                      </>
                    ) : (
                      <p className="text-ops-amber">Pending</p>
                    )}
                  </DetailSection>
                </div>

                <DetailSection label="Implementation Date">
                  <p>{selectedEcn.implementation_date ? new Date(selectedEcn.implementation_date + 'T00:00:00').toLocaleDateString() : '—'}</p>
                </DetailSection>

                {/* Lifecycle action buttons */}
                {selectedEcn.status === 'draft' && (
                  <div className="pt-2 border-t border-border">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={updateECN.isPending}
                      onClick={() => handleSubmitForReview(selectedEcn)}
                    >
                      {updateECN.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                      Submit for Review
                    </Button>
                  </div>
                )}

                {selectedEcn.status === 'under_review' && (
                  <div className="pt-2 border-t border-border flex gap-2">
                    {can('approve_ecn') ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={updateECN.isPending}
                        onClick={() => handleApprove(selectedEcn)}
                      >
                        {updateECN.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1" disabled title="Your role cannot approve ECNs">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                    )}
                    {can('reject_ecn') ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        disabled={updateECN.isPending}
                        onClick={() => setRejectTarget(selectedEcn.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" className="flex-1" disabled title="Your role cannot reject ECNs">
                        <X className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    )}
                  </div>
                )}

                {selectedEcn.status === 'approved' && (
                  <div className="pt-2 border-t border-border">
                    {can('implement_ecn') ? (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={updateECN.isPending}
                        onClick={() => setConfirmImplement(selectedEcn.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Mark Implemented
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full" disabled title="Your role cannot mark ECNs as implemented">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Mark Implemented
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* New ECN Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) resetCreate(); else setShowCreate(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create ECN</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {/* Auto-generated ECN number */}
            <div>
              <Label className="text-xs text-muted-foreground">ECN Number</Label>
              <Input value={autoEcnNumber} readOnly className="text-xs h-9 font-mono bg-muted/50" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Title *</Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Brief change description"
                className="text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Detailed change description, rationale, and scope..."
                rows={3}
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={newPriority} onValueChange={v => setNewPriority(v as typeof newPriority)}>
                <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Multi-select BOM parts */}
            <div>
              <Label className="text-xs text-muted-foreground">Affected Parts</Label>
              <Popover open={partsOpen} onOpenChange={setPartsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={partsOpen}
                    className="w-full justify-between text-xs h-9 font-normal"
                  >
                    {newParts.length > 0
                      ? `${newParts.length} part${newParts.length !== 1 ? 's' : ''} selected`
                      : 'Select parts from BOM...'}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search parts..." className="text-xs h-9" />
                    <CommandList>
                      <CommandEmpty>No parts found.</CommandEmpty>
                      <CommandGroup>
                        {bomParts.map(part => {
                          const isSelected = newParts.includes(part.number);
                          return (
                            <CommandItem
                              key={part.number}
                              value={part.number}
                              onSelect={() => {
                                setNewParts(prev =>
                                  isSelected
                                    ? prev.filter(p => p !== part.number)
                                    : [...prev, part.number]
                                );
                              }}
                            >
                              <div className={cn(
                                'mr-2 flex h-4 w-4 items-center justify-center rounded border border-primary',
                                isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                              )}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                              <span className="font-mono text-[11px]">{part.number}</span>
                              <span className="ml-2 text-[10px] text-muted-foreground truncate">{part.desc}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected parts as chips */}
              {newParts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {newParts.map(pn => (
                    <span
                      key={pn}
                      className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground"
                    >
                      {pn}
                      <button
                        type="button"
                        onClick={() => setNewParts(prev => prev.filter(p => p !== pn))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={handleCreate}
              disabled={createECN.isPending || !newTitle.trim()}
              className="w-full"
            >
              {createECN.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create ECN
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={open => { if (!open) { setRejectTarget(null); setRejectionReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject ECN</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this ECN.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Rejection reason..."
              rows={3}
            />
            <Button
              variant="destructive"
              className="w-full"
              disabled={updateECN.isPending}
              onClick={handleReject}
            >
              {updateECN.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Implement Confirmation Dialog */}
      <Dialog open={!!confirmImplement} onOpenChange={open => { if (!open) setConfirmImplement(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Implemented</DialogTitle>
            <DialogDescription>
              This will mark the ECN as implemented with today's date. This action confirms the change has been applied.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmImplement(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={updateECN.isPending}
              onClick={handleImplement}
            >
              {updateECN.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ECNTracker;
