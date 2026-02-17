import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FileText, Search, ChevronRight, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useBomLines, useSuppliers, useInventory, BomLineRow } from '@/hooks/use-supabase-data';
import { useProject } from '@/contexts/ProjectContext';

// A "BOM" is represented by bom_level=0 rows; children are bom_level>0 under the same upload_batch_id
interface BomHeader {
  id: string;
  uploadBatchId: string;
  name: string;
  componentNumber: string;
  materialType: string;
  uploadedAt: string;
}

const BOM = () => {
  const { selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const [search, setSearch] = useState('');
  const [selectedBom, setSelectedBom] = useState<BomHeader | null>(null);
  const [lineSearch, setLineSearch] = useState('');
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  const { data: allLines = [], isLoading: linesLoading } = useBomLines(versionId);
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory(versionId);

  const isLoading = linesLoading || suppliersLoading || inventoryLoading;

  // Build supplier lookup by part_number
  const supplierByPart = useMemo(() => {
    const map = new Map<string, typeof suppliers[0]>();
    suppliers.forEach(s => map.set(s.part_number, s));
    return map;
  }, [suppliers]);

  // Build inventory lookup by part_number
  const inventoryByPart = useMemo(() => {
    const map = new Map<string, typeof inventory[0]>();
    inventory.forEach(i => map.set(i.part_number, i));
    return map;
  }, [inventory]);

  // Extract BOM headers (level 0 lines)
  const bomHeaders = useMemo<BomHeader[]>(() => {
    return allLines
      .filter(l => l.bom_level === 0)
      .filter(l =>
        (l.object_description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        l.component_number.toLowerCase().includes(search.toLowerCase())
      )
      .map(l => ({
        id: l.id,
        uploadBatchId: l.upload_batch_id,
        name: l.object_description ?? l.component_number,
        componentNumber: l.component_number,
        materialType: l.material_type ?? '',
        uploadedAt: l.uploaded_at,
      }));
  }, [allLines, search]);

  // Children of the selected BOM (level > 0)
  const children = useMemo(() => {
    if (!selectedBom) return [];
    return allLines
      .filter(l => l.upload_batch_id === selectedBom.uploadBatchId && l.bom_level > 0)
      .filter(l =>
        l.component_number.toLowerCase().includes(lineSearch.toLowerCase()) ||
        (l.object_description ?? '').toLowerCase().includes(lineSearch.toLowerCase())
      );
  }, [allLines, selectedBom, lineSearch]);

  // Compute stock status for a part
  const getStockStatus = useCallback((partNumber: string, requiredQty: number) => {
    const inv = inventoryByPart.get(partNumber);
    if (!inv) return { onHand: null, onOrder: null, variance: null, status: null as string | null };
    const onHand = inv.on_hand_qty ?? 0;
    const onOrder = inv.on_order_qty ?? 0;
    const variance = requiredQty - onHand - onOrder;
    let status = 'Available';
    if (variance > 0 && onHand === 0) status = 'Critical';
    else if (variance > 0) status = 'Short';
    return { onHand, onOrder, variance, status };
  }, [inventoryByPart]);

  // Risk detection for BOM cards
  const bomHasRisk = useCallback((uploadBatchId: string) => {
    return allLines
      .filter(l => l.upload_batch_id === uploadBatchId && l.bom_level > 0)
      .some(l => {
        const { status } = getStockStatus(l.component_number, Number(l.required_qty));
        return status === 'Short' || status === 'Critical';
      });
  }, [allLines, getStockStatus]);

  const filteredBoms = useMemo(() => {
    if (!showAtRiskOnly) return bomHeaders;
    return bomHeaders.filter(b => bomHasRisk(b.uploadBatchId));
  }, [bomHeaders, showAtRiskOnly, bomHasRisk]);

  const totalCost = useMemo(() => {
    return children.reduce((sum, l) => {
      const sup = supplierByPart.get(l.component_number);
      const cost = sup?.unit_cost ?? Number(l.standard_price) ?? 0;
      return sum + cost * Number(l.required_qty);
    }, 0);
  }, [children, supplierByPart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Detail view
  if (selectedBom) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button
              onClick={() => { setSelectedBom(null); setLineSearch(''); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> All BOMs
            </button>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {selectedBom.name}
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="font-mono text-xs text-muted-foreground">{selectedBom.componentNumber}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{children.length} parts</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs font-mono text-foreground">
                Total: ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search parts..."
              value={lineSearch}
              onChange={e => setLineSearch(e.target.value)}
              className="rounded border border-input bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-md border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Lvl</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Part Number</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Qty</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">UOM</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Supplier</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Lead Time</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Unit Cost</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Ext. Cost</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">On Hand</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">On Order</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Variance</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Stock</th>
                </tr>
              </thead>
              <tbody>
                {children.map((line) => {
                  const sup = supplierByPart.get(line.component_number);
                  const unitCost = sup?.unit_cost ?? Number(line.standard_price) ?? 0;
                  const reqQty = Number(line.required_qty);
                  const { onHand, onOrder, variance, status } = getStockStatus(line.component_number, reqQty);

                  return (
                    <tr key={line.id} className="data-table-row">
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{line.bom_level}</td>
                      <td className="px-3 py-2.5 font-mono font-medium text-foreground">{line.component_number}</td>
                      <td className="px-3 py-2.5 text-foreground">{line.object_description ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">{reqQty.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{line.base_unit_measure ?? 'EA'}</td>
                      <td className="px-3 py-2.5 text-foreground">{sup?.supplier_name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{sup?.lead_time_days ? `${sup.lead_time_days}d` : '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">{unitCost > 0 ? `$${unitCost.toFixed(2)}` : '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium text-foreground">
                        {unitCost > 0 ? `$${(unitCost * reqQty).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground">{onHand ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{onOrder ?? '—'}</td>
                      <td className={cn("px-3 py-2.5 text-right font-mono font-semibold",
                        variance != null && variance > 10 && "text-accent",
                        variance != null && variance > 0 && variance <= 10 && "text-ops-amber",
                        variance != null && variance <= 0 && "text-ops-green",
                        variance == null && "text-muted-foreground",
                      )}>
                        {variance ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {status ? (
                          <span className={cn(
                            "inline-block text-[10px] font-semibold uppercase tracking-wider",
                            status === 'Available' && "text-ops-green",
                            status === 'Short' && "text-ops-amber",
                            status === 'Critical' && "text-accent",
                          )}>
                            {status}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {children.length === 0 && (
                  <tr><td colSpan={13} className="px-3 py-10 text-center text-muted-foreground">No parts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Bill of Materials
          </h2>
          <p className="text-xs text-muted-foreground">{filteredBoms.length} of {bomHeaders.length} BOMs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAtRiskOnly(prev => !prev)}
            className={cn(
              "flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              showAtRiskOnly
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            At Risk
          </button>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search BOMs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded border border-input bg-card pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-3">
        {filteredBoms.map((bom) => {
          const bomChildren = allLines.filter(l => l.upload_batch_id === bom.uploadBatchId && l.bom_level > 0);
          const lineCount = bomChildren.length;

          const riskParts = bomChildren.filter(l => {
            const { status } = getStockStatus(l.component_number, Number(l.required_qty));
            return status === 'Short' || status === 'Critical';
          });
          const criticalCount = bomChildren.filter(l => {
            const { status } = getStockStatus(l.component_number, Number(l.required_qty));
            return status === 'Critical';
          }).length;
          const shortCount = riskParts.length - criticalCount;

          return (
            <button
              key={bom.id}
              onClick={() => setSelectedBom(bom)}
              className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 group"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{bom.name}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="font-mono">{bom.componentNumber}</span>
                  <span>{lineCount} parts</span>
                  <span>{new Date(bom.uploadedAt).toLocaleDateString()}</span>
                </div>
                {riskParts.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    {criticalCount > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                        {criticalCount} Critical
                      </span>
                    )}
                    {shortCount > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-ops-amber">
                        {shortCount} Short
                      </span>
                    )}
                  </div>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          );
        })}
        {bomHeaders.length === 0 && (
          <div className="rounded-md border border-border bg-card px-4 py-10 text-center text-muted-foreground text-sm">
            No BOMs found
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default BOM;
