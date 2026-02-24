import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FileText, Search, ChevronRight, ArrowLeft, AlertTriangle, Loader2, Upload, X, ChevronDown, Check, Pencil } from 'lucide-react';
import { useState, useMemo, useCallback, useRef } from 'react';
import { useBomLines, useSuppliers, useInventory, useUploadBomLines, useUpdateBomLine, BomLineRow } from '@/hooks/use-supabase-data';
import { useProject } from '@/contexts/ProjectContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// A "BOM" is represented by bom_level=0 rows; children are bom_level>0 under the same upload_batch_id
interface BomHeader {
  id: string;
  uploadBatchId: string;
  name: string;
  componentNumber: string;
  materialType: string;
  uploadedAt: string;
}

// ── Column auto-mapping for Excel/CSV uploads ────────────────────
const normalizeHeader = (h: string): string =>
  h.toLowerCase().replace(/[^a-z0-9]/g, '');

const AUTO_MAP: Record<string, string> = {
  bomlevel: 'bom_level', level: 'bom_level', lvl: 'bom_level',
  component: 'component_number', componentnumber: 'component_number',
  partnumber: 'component_number', partno: 'component_number',
  material: 'component_number', materialnumber: 'component_number',
  description: 'object_description', objectdescription: 'object_description',
  componentdescription: 'object_description', materialdescription: 'object_description',
  qty: 'required_qty', quantity: 'required_qty', requiredqty: 'required_qty',
  requiredquantity: 'required_qty',
  compqty: 'component_quantity', componentquantity: 'component_quantity',
  unit: 'base_unit_measure', uom: 'base_unit_measure',
  baseunit: 'base_unit_measure', baseunitmeasure: 'base_unit_measure',
  baseunitofmeasure: 'base_unit_measure',
  materialtype: 'material_type', mattype: 'material_type',
  itemnumber: 'item_number', item: 'item_number', itemno: 'item_number',
  plant: 'plant_sp_matl', storagelocation: 'storage_location', sloc: 'storage_location',
  standardprice: 'standard_price', price: 'standard_price', stdprice: 'standard_price',
  sortstring: 'sort_string', itemcategory: 'item_category',
  altitemgroup: 'alt_item_group', changenumber: 'change_number',
  validfrom: 'valid_from', validto: 'valid_to',
  suppliersap: 'supplier_sap', supplier: 'supplier_sap',
  effectiveoutdate: 'effective_out_date', engineeringdesign: 'engineering_design',
  explosivelevel: 'explosive_level', followupmaterial: 'follow_up_material',
  itemtextline2: 'item_text_line_2', phantom: 'phantom',
  assemblyindicator: 'assembly_indicator', backflush: 'backflush',
  bulkmaterial: 'bulk_material', relevancytocosting: 'relevancy_to_costing',
  usageprobability: 'usage_probability', specialprocurementtype: 'special_procurement_type',
  componentunit: 'component_unit', comptuxmaterialgroup: 'comp_tux_material_group',
};

const BOM_FIELD_OPTIONS = [
  { key: '__skip__', label: '— Skip —' },
  { key: 'bom_level', label: 'BOM Level' },
  { key: 'component_number', label: 'Component Number' },
  { key: 'object_description', label: 'Description' },
  { key: 'required_qty', label: 'Required Qty' },
  { key: 'component_quantity', label: 'Component Qty' },
  { key: 'base_unit_measure', label: 'Unit of Measure' },
  { key: 'material_type', label: 'Material Type' },
  { key: 'item_number', label: 'Item Number' },
  { key: 'standard_price', label: 'Standard Price' },
  { key: 'sort_string', label: 'Sort String' },
  { key: 'item_category', label: 'Item Category' },
  { key: 'plant_sp_matl', label: 'Plant' },
  { key: 'storage_location', label: 'Storage Location' },
  { key: 'supplier_sap', label: 'Supplier (SAP)' },
  { key: 'valid_from', label: 'Valid From' },
  { key: 'valid_to', label: 'Valid To' },
  { key: 'change_number', label: 'Change Number' },
  { key: 'alt_item_group', label: 'Alt Item Group' },
  { key: 'assembly_indicator', label: 'Assembly Indicator' },
  { key: 'phantom', label: 'Phantom' },
  { key: 'special_procurement_type', label: 'Special Procurement' },
  { key: 'component_unit', label: 'Component Unit' },
  { key: 'engineering_design', label: 'Engineering Design' },
  { key: 'explosive_level', label: 'Explosive Level' },
  { key: 'follow_up_material', label: 'Follow-up Material' },
  { key: 'item_text_line_2', label: 'Item Text Line 2' },
  { key: 'comp_tux_material_group', label: 'Material Group' },
  { key: 'relevancy_to_costing', label: 'Relevancy to Costing' },
  { key: 'usage_probability', label: 'Usage Probability' },
  { key: 'backflush', label: 'Backflush' },
  { key: 'bulk_material', label: 'Bulk Material' },
  { key: 'effective_out_date', label: 'Effective Out Date' },
];

const ACCEPTED_EXTENSIONS = '.xlsx,.xls,.csv';

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
  const uploadBom = useUploadBomLines();
  const updateBomLine = useUpdateBomLine();

  const isLoading = linesLoading || suppliersLoading || inventoryLoading;

  // ── Rename BOM state ────────────────────────────────────────────
  const [editingBomId, setEditingBomId] = useState<string | null>(null);
  const [editBomName, setEditBomName] = useState('');

  const startRename = useCallback((e: React.MouseEvent, bom: BomHeader) => {
    e.stopPropagation();
    setEditingBomId(bom.id);
    setEditBomName(bom.name);
  }, []);

  const saveRename = useCallback(async () => {
    if (!editingBomId || !editBomName.trim()) return;
    try {
      await updateBomLine.mutateAsync({ id: editingBomId, object_description: editBomName.trim() });
      // Update selectedBom if we're renaming the currently viewed BOM
      if (selectedBom?.id === editingBomId) {
        setSelectedBom({ ...selectedBom, name: editBomName.trim() });
      }
      toast.success('BOM renamed');
    } catch {
      toast.error('Failed to rename BOM');
    }
    setEditingBomId(null);
  }, [editingBomId, editBomName, updateBomLine, selectedBom]);

  // ── Upload state ────────────────────────────────────────────────
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = useCallback(() => {
    setUploadFile(null);
    setParsedRows([]);
    setExcelHeaders([]);
    setColumnMapping({});
    setParseError(null);
    setShowMapping(false);
  }, []);

  const parseFile = useCallback((file: File) => {
    setUploadFile(file);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

        if (rows.length === 0) {
          setParseError('File is empty or has no data rows.');
          return;
        }

        const headers = Object.keys(rows[0]);
        const mapping: Record<string, string> = {};
        const usedFields = new Set<string>();

        headers.forEach(h => {
          const norm = normalizeHeader(h);
          const mapped = AUTO_MAP[norm];
          if (mapped && !usedFields.has(mapped)) {
            mapping[h] = mapped;
            usedFields.add(mapped);
          }
        });

        setExcelHeaders(headers);
        setColumnMapping(mapping);
        setParsedRows(rows);
      } catch {
        setParseError('Failed to parse file. Ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  }, [parseFile]);

  const mappedFieldCount = useMemo(
    () => Object.values(columnMapping).filter(v => v).length,
    [columnMapping]
  );

  const hasComponentNumber = useMemo(
    () => Object.values(columnMapping).includes('component_number'),
    [columnMapping]
  );

  const handleUpload = async () => {
    if (!versionId || parsedRows.length === 0 || !hasComponentNumber) return;
    const batchId = crypto.randomUUID();

    const lines = parsedRows.map((row) => {
      const line: Record<string, any> = {
        upload_batch_id: batchId,
        project_version_id: versionId,
        component_number: '',
        required_qty: 0,
        bom_level: 0,
        component_quantity: 0,
      };

      Object.entries(columnMapping).forEach(([excelCol, dbCol]) => {
        if (!dbCol || row[excelCol] == null) return;
        const val = row[excelCol];
        if (['bom_level', 'required_qty', 'component_quantity', 'standard_price', 'explosive_level', 'usage_probability'].includes(dbCol)) {
          line[dbCol] = Number(val) || 0;
        } else if (['assembly_indicator', 'backflush', 'bulk_material', 'phantom', 'relevancy_to_costing'].includes(dbCol)) {
          line[dbCol] = val === true || val === 'true' || val === 'X' || val === 'x' || val === 1 || val === '1';
        } else {
          line[dbCol] = String(val).trim();
        }
      });

      if (!line.component_number) line.component_number = 'UNKNOWN';
      return line;
    });

    try {
      const count = await uploadBom.mutateAsync({ lines, versionId });
      toast.success(`Uploaded ${count} BOM lines`);
      resetUpload();
      setShowUpload(false);
    } catch {
      toast.error('Failed to upload BOM data');
    }
  };

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
            <div className="flex items-center gap-2">
              {editingBomId === selectedBom.id ? (
                <div className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={editBomName}
                    onChange={e => setEditBomName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveRename();
                      if (e.key === 'Escape') setEditingBomId(null);
                    }}
                    className="rounded border border-input bg-background px-2 py-0.5 text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                  <button
                    onClick={saveRename}
                    disabled={updateBomLine.isPending || !editBomName.trim()}
                    className="rounded bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                  >
                    {updateBomLine.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingBomId(null)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {selectedBom.name}
                  <button
                    onClick={e => startRename(e, selectedBom)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Rename BOM"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </h2>
              )}
            </div>
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
            onClick={() => { resetUpload(); setShowUpload(true); }}
            className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1.5 text-[11px] font-medium text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Upload className="h-3 w-3" />
            Upload BOM
          </button>
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
            <div
              key={bom.id}
              onClick={() => { if (editingBomId !== bom.id) setSelectedBom(bom); }}
              className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 group cursor-pointer"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {editingBomId === bom.id ? (
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editBomName}
                        onChange={e => setEditBomName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveRename();
                          if (e.key === 'Escape') setEditingBomId(null);
                        }}
                        className="rounded border border-input bg-background px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                      />
                      <button
                        onClick={saveRename}
                        disabled={updateBomLine.isPending || !editBomName.trim()}
                        className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                      >
                        {updateBomLine.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingBomId(null)}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground">{bom.name}</span>
                      <button
                        onClick={e => startRename(e, bom)}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                        title="Rename BOM"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </>
                  )}
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
            </div>
          );
        })}
        {bomHeaders.length === 0 && (
          <div className="rounded-md border border-border bg-card px-4 py-10 text-center text-muted-foreground text-sm">
            No BOMs found
          </div>
        )}
      </motion.div>

      {/* Upload BOM Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => { if (!open) resetUpload(); setShowUpload(open); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload BOM File</DialogTitle>
          </DialogHeader>

          {/* Drop zone / file selector */}
          {!uploadFile ? (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors",
                isDragOver ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/50"
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : parseError ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 p-3 text-sm text-accent">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {parseError}
              </div>
              <Button variant="outline" onClick={resetUpload} className="w-full">Try Another File</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{uploadFile.name}</span>
                  <span className="text-muted-foreground">{parsedRows.length} rows</span>
                  <span className="text-muted-foreground">{mappedFieldCount} columns mapped</span>
                </div>
                <button onClick={resetUpload} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Validation */}
              {!hasComponentNumber && (
                <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 p-3 text-xs text-accent">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Could not detect a <strong>Component Number</strong> column. Please map it below before uploading.</span>
                </div>
              )}

              {/* Column mapping (collapsible) */}
              <div className="rounded-md border border-border">
                <button
                  onClick={() => setShowMapping(prev => !prev)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors"
                >
                  <span>Column Mapping</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", showMapping && "rotate-180")} />
                </button>
                {showMapping && (
                  <div className="border-t border-border px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {excelHeaders.map(header => (
                      <div key={header} className="flex items-center gap-2 text-xs">
                        <span className="w-40 truncate text-muted-foreground font-mono" title={header}>{header}</span>
                        <span className="text-muted-foreground/50">→</span>
                        <Select
                          value={columnMapping[header] || '__skip__'}
                          onValueChange={v => setColumnMapping(prev => ({ ...prev, [header]: v === '__skip__' ? '' : v }))}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue placeholder="Skip" />
                          </SelectTrigger>
                          <SelectContent>
                            {BOM_FIELD_OPTIONS.map(f => (
                              <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="rounded-md border border-border overflow-hidden">
                <div className="px-3 py-1.5 bg-muted/30 border-b border-border">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Preview (first {Math.min(parsedRows.length, 5)} rows)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        {excelHeaders.filter(h => columnMapping[h]).map(h => (
                          <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {BOM_FIELD_OPTIONS.find(f => f.key === columnMapping[h])?.label ?? columnMapping[h]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          {excelHeaders.filter(h => columnMapping[h]).map(h => (
                            <td key={h} className="px-2 py-1.5 text-foreground whitespace-nowrap max-w-[200px] truncate">
                              {row[h] != null ? String(row[h]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Upload button */}
              <Button
                onClick={handleUpload}
                disabled={uploadBom.isPending || !hasComponentNumber || parsedRows.length === 0}
                className="w-full"
              >
                {uploadBom.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</>
                ) : (
                  <>Upload {parsedRows.length} rows</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BOM;
