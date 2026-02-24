import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, Loader2, Plus, ChevronDown, ChevronRight, ClipboardList } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import {
  useBomLines, useSuppliers, useInventory,
  useWorkOrders, useCreateWorkOrder, useCreateWorkOrderLines,
  useWorkOrderLines, useUpdateWorkOrder,
  useCreatePickingOrders,
  type WorkOrderRow,
} from '@/hooks/use-supabase-data';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// ── WorkOrderCard (expandable row) ───────────────────────────────

const WorkOrderCard = ({
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

// ── Main Materials Page ──────────────────────────────────────────

interface BomHeader {
  id: string;
  uploadBatchId: string;
  name: string;
  componentNumber: string;
}

const Materials = () => {
  const { selectedProject, selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const [search, setSearch] = useState('');

  const { data: allLines = [], isLoading: linesLoading } = useBomLines(versionId);
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory(versionId);
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrders(versionId);
  const createWO = useCreateWorkOrder();
  const createWOLines = useCreateWorkOrderLines();
  const updateWO = useUpdateWorkOrder();
  const createPickingOrders = useCreatePickingOrders();

  const isLoading = linesLoading || suppliersLoading || inventoryLoading || woLoading;

  // ── WO dialog state ─────────────────────────────────────────
  const [showCreateWO, setShowCreateWO] = useState(false);
  const [woMode, setWoMode] = useState<'from_bom' | 'custom'>('from_bom');
  const [woNumber, setWoNumber] = useState('');
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [customSelectedParts, setCustomSelectedParts] = useState<Set<string>>(new Set());
  const [expandedWOId, setExpandedWOId] = useState<string | null>(null);

  // Build lookup maps
  const supplierByPart = useMemo(() => {
    const map = new Map<string, typeof suppliers[0]>();
    suppliers.forEach(s => map.set(s.part_number, s));
    return map;
  }, [suppliers]);

  const inventoryByPart = useMemo(() => {
    const map = new Map<string, typeof inventory[0]>();
    inventory.forEach(i => map.set(i.part_number, i));
    return map;
  }, [inventory]);

  // BOM headers for the "From BOM" dropdown
  const bomHeaders = useMemo<BomHeader[]>(() => {
    return allLines
      .filter(l => l.bom_level === 0)
      .map(l => ({
        id: l.id,
        uploadBatchId: l.upload_batch_id,
        name: l.object_description ?? l.component_number,
        componentNumber: l.component_number,
      }));
  }, [allLines]);

  // Parts for the selected BOM (preview in From BOM mode)
  const bomPartsForSelected = useMemo(() => {
    const header = bomHeaders.find(b => b.id === selectedBomId);
    if (!header) return [];
    return allLines.filter(l => l.upload_batch_id === header.uploadBatchId && l.bom_level > 0);
  }, [allLines, bomHeaders, selectedBomId]);

  // Deduplicate parts from bom_lines (level > 0 = actual components)
  const materials = useMemo(() => {
    const seen = new Set<string>();
    return allLines
      .filter(l => l.bom_level > 0)
      .filter(l => {
        if (seen.has(l.component_number)) return false;
        seen.add(l.component_number);
        return true;
      })
      .filter(l =>
        l.component_number.toLowerCase().includes(search.toLowerCase()) ||
        (l.object_description ?? '').toLowerCase().includes(search.toLowerCase())
      )
      .map(l => {
        const inv = inventoryByPart.get(l.component_number);
        const sup = supplierByPart.get(l.component_number);
        const requiredQty = Number(l.required_qty);
        const onHand = inv?.on_hand_qty ?? 0;
        const onOrder = inv?.on_order_qty ?? 0;
        const variance = requiredQty - onHand - onOrder;
        let status = 'Available';
        if (variance > 0 && onHand === 0) status = 'Critical';
        else if (variance > 0) status = 'Short';

        return {
          id: l.id,
          partNumber: l.component_number,
          description: l.object_description ?? '',
          requiredQty,
          onHand,
          onOrder,
          variance,
          status,
          supplier: sup?.supplier_name ?? null,
          leadTime: sup?.lead_time_days ?? null,
          binLocation: inv?.bin_location ?? null,
        };
      });
  }, [allLines, inventoryByPart, supplierByPart, search]);

  const togglePartSelection = useCallback((partNumber: string) => {
    setCustomSelectedParts(prev => {
      const next = new Set(prev);
      if (next.has(partNumber)) next.delete(partNumber);
      else next.add(partNumber);
      return next;
    });
  }, []);

  const resetWODialog = useCallback(() => {
    setWoNumber('');
    setSelectedBomId('');
    setCustomSelectedParts(new Set());
    setWoMode('from_bom');
  }, []);

  const handleCreateWorkOrder = useCallback(async () => {
    if (!woNumber.trim() || !selectedProject || !versionId) return;

    if (!/^\d+$/.test(woNumber.trim())) {
      toast.error('WO# must be a number (e.g. 12523311)');
      return;
    }

    try {
      let linesToInsert: { part_number: string; description: string; required_qty: number; unit_of_measure: string }[] = [];

      if (woMode === 'from_bom') {
        if (!selectedBomId) { toast.error('Please select a BOM'); return; }
        linesToInsert = bomPartsForSelected.map(l => ({
          part_number: l.component_number,
          description: l.object_description ?? '',
          required_qty: Number(l.required_qty),
          unit_of_measure: l.base_unit_measure ?? 'EA',
        }));
      } else {
        if (customSelectedParts.size === 0) { toast.error('Please select at least one part'); return; }
        linesToInsert = materials
          .filter(m => customSelectedParts.has(m.partNumber))
          .map(m => ({
            part_number: m.partNumber,
            description: m.description,
            required_qty: m.requiredQty,
            unit_of_measure: 'EA',
          }));
      }

      const wo = await createWO.mutateAsync({
        project_id: selectedProject.id,
        version_id: versionId,
        work_order_number: woNumber.trim(),
        bom_header_id: woMode === 'from_bom' ? selectedBomId : null,
        mode: woMode,
      });

      if (linesToInsert.length > 0) {
        await createWOLines.mutateAsync(
          linesToInsert.map(line => ({
            work_order_id: wo.id,
            ...line,
          }))
        );
      }

      toast.success(`Work Order ${woNumber} created with ${linesToInsert.length} lines`);
      setShowCreateWO(false);
      resetWODialog();
    } catch {
      toast.error('Failed to create work order');
    }
  }, [woNumber, woMode, selectedBomId, bomPartsForSelected, customSelectedParts, materials, versionId, selectedProject, createWO, createWOLines, resetWODialog]);

  const handleStatusChange = useCallback(async (wo: WorkOrderRow, status: string) => {
    try {
      // When starting a WO, create picking orders for each WO line
      if (status === 'In Progress') {
        const { data: woLines, error } = await supabase
          .from('work_order_lines')
          .select('*')
          .eq('work_order_id', wo.id);
        if (error) throw error;

        if (woLines && woLines.length > 0) {
          const pickingOrders = woLines.map(line => ({
            project_id: wo.project_id,
            version_id: wo.version_id,
            work_order_number: wo.work_order_number,
            part_number: line.part_number,
            pick_qty: Number(line.required_qty),
            bin_location: inventoryByPart.get(line.part_number)?.bin_location ?? null,
            status: 'Pending',
          }));
          await createPickingOrders.mutateAsync(pickingOrders);
        }
      }

      await updateWO.mutateAsync({ id: wo.id, status });
      toast.success(
        status === 'In Progress'
          ? `WO ${wo.work_order_number} started — picking orders created`
          : `WO ${wo.work_order_number} → ${status}`
      );
    } catch {
      toast.error('Failed to update work order');
    }
  }, [updateWO, createPickingOrders, inventoryByPart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" /> Material Tracker
          </h2>
          <p className="text-xs text-muted-foreground">{materials.length} materials</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetWODialog(); setShowCreateWO(true); }}
            className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1.5 text-[11px] font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Plus className="h-3 w-3" />
            Create Work Order
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded border border-input bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-md border border-border bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Part Number</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Supplier</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Required</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">On Hand</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">On Order</th>
                <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Variance</th>
                <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Bin</th>
                <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((mat) => (
                <tr key={mat.id} className="data-table-row">
                  <td className="px-3 py-2.5 font-mono font-medium text-foreground">{mat.partNumber}</td>
                  <td className="px-3 py-2.5 text-foreground">{mat.description}</td>
                  <td className="px-3 py-2.5 text-foreground">{mat.supplier ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{mat.requiredQty}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-foreground">{mat.onHand}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{mat.onOrder}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold",
                    mat.variance > 10 && "text-accent",
                    mat.variance > 0 && mat.variance <= 10 && "text-ops-amber",
                    mat.variance <= 0 && "text-ops-green",
                  )}>
                    {mat.variance}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{mat.binLocation ?? '—'}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn(
                      "inline-block text-[10px] font-semibold uppercase tracking-wider",
                      mat.status === 'Available' && "text-ops-green",
                      mat.status === 'Short' && "text-ops-amber",
                      mat.status === 'Critical' && "text-accent",
                    )}>
                      {mat.status}
                    </span>
                  </td>
                </tr>
              ))}
              {materials.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                    No materials found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Work Orders Section */}
      {workOrders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Work Orders
            <span className="text-xs font-normal text-muted-foreground">({workOrders.length})</span>
          </h3>
          <div className="space-y-2">
            {workOrders.map(wo => (
              <WorkOrderCard
                key={wo.id}
                wo={wo}
                expanded={expandedWOId === wo.id}
                onToggle={() => setExpandedWOId(prev => prev === wo.id ? null : wo.id)}
                onStatusChange={(status) => handleStatusChange(wo, status)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Work Order Dialog */}
      <Dialog open={showCreateWO} onOpenChange={(open) => { if (!open) resetWODialog(); setShowCreateWO(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* WO Number */}
            <div>
              <Label>Work Order Number *</Label>
              <Input
                placeholder="12523311"
                value={woNumber}
                onChange={e => setWoNumber(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Numeric format (e.g. 12523311)</p>
            </div>

            {/* Mode toggle */}
            <div>
              <Label>Source</Label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { setWoMode('from_bom'); setCustomSelectedParts(new Set()); }}
                  className={cn(
                    "flex-1 rounded border px-3 py-2 text-xs font-medium transition-colors",
                    woMode === 'from_bom'
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  From BOM
                </button>
                <button
                  onClick={() => { setWoMode('custom'); setSelectedBomId(''); }}
                  className={cn(
                    "flex-1 rounded border px-3 py-2 text-xs font-medium transition-colors",
                    woMode === 'custom'
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* From BOM mode */}
            {woMode === 'from_bom' && (
              <div className="space-y-3">
                <div>
                  <Label>Select BOM</Label>
                  <Select value={selectedBomId} onValueChange={setSelectedBomId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a BOM..." />
                    </SelectTrigger>
                    <SelectContent>
                      {bomHeaders.map(bom => (
                        <SelectItem key={bom.id} value={bom.id}>
                          {bom.name} ({bom.componentNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBomId && (
                  <div className="rounded-md border border-border overflow-hidden">
                    <div className="px-3 py-1.5 bg-muted/30 border-b border-border">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {bomPartsForSelected.length} parts will be added
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Part</th>
                            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Description</th>
                            <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomPartsForSelected.map(p => (
                            <tr key={p.id} className="border-b border-border/50 last:border-0">
                              <td className="px-2 py-1.5 font-mono">{p.component_number}</td>
                              <td className="px-2 py-1.5">{p.object_description ?? '—'}</td>
                              <td className="px-2 py-1.5 text-right font-mono">{Number(p.required_qty)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom mode */}
            {woMode === 'custom' && (
              <div className="space-y-3">
                <Label>Select Parts ({customSelectedParts.size} selected)</Label>
                <div className="rounded-md border border-border overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border bg-muted/20">
                        <th className="px-2 py-1.5 w-8"></th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Part</th>
                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Description</th>
                        <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Req Qty</th>
                        <th className="px-2 py-1.5 text-center font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map(mat => (
                        <tr
                          key={mat.id}
                          onClick={() => togglePartSelection(mat.partNumber)}
                          className={cn(
                            "border-b border-border/50 last:border-0 cursor-pointer transition-colors",
                            customSelectedParts.has(mat.partNumber) ? "bg-accent/5" : "hover:bg-muted/30"
                          )}
                        >
                          <td className="px-2 py-1.5 text-center">
                            <div className={cn(
                              "h-3.5 w-3.5 rounded-sm border flex items-center justify-center mx-auto transition-colors",
                              customSelectedParts.has(mat.partNumber)
                                ? "bg-accent border-accent"
                                : "border-border"
                            )}>
                              {customSelectedParts.has(mat.partNumber) && (
                                <svg className="h-2.5 w-2.5 text-accent-foreground" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M2 6l3 3 5-5" />
                                </svg>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 font-mono">{mat.partNumber}</td>
                          <td className="px-2 py-1.5">{mat.description}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{mat.requiredQty}</td>
                          <td className="px-2 py-1.5 text-center">
                            <span className={cn(
                              "text-[10px] font-semibold uppercase",
                              mat.status === 'Available' && "text-ops-green",
                              mat.status === 'Short' && "text-ops-amber",
                              mat.status === 'Critical' && "text-accent",
                            )}>{mat.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Create button */}
            <Button
              onClick={handleCreateWorkOrder}
              disabled={
                createWO.isPending ||
                !woNumber.trim() ||
                (woMode === 'from_bom' && !selectedBomId) ||
                (woMode === 'custom' && customSelectedParts.size === 0)
              }
              className="w-full"
            >
              {createWO.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
              ) : (
                <>Create Work Order</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materials;
