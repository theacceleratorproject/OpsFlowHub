import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Package, Search, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useBomLines, useSuppliers, useInventory } from '@/hooks/use-supabase-data';
import { useProject } from '@/contexts/ProjectContext';

const Materials = () => {
  const { selectedVersion } = useProject();
  const versionId = selectedVersion?.id;
  const [search, setSearch] = useState('');

  const { data: allLines = [], isLoading: linesLoading } = useBomLines(versionId);
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory(versionId);

  const isLoading = linesLoading || suppliersLoading || inventoryLoading;

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
            <Package className="h-4 w-4 text-muted-foreground" /> Material Tracker
          </h2>
          <p className="text-xs text-muted-foreground">{materials.length} materials</p>
        </div>
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
    </div>
  );
};

export default Materials;
