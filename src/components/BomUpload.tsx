import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useProject } from '@/contexts/ProjectContext';
import { useCreateBomLines } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { Upload, Loader2, X, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const EXPECTED_FIELDS = [
  { key: 'part_number', label: 'Part Number', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'quantity', label: 'Quantity', required: true },
  { key: 'uom', label: 'UOM', required: false },
] as const;

type FieldKey = (typeof EXPECTED_FIELDS)[number]['key'];

// Common header aliases for auto-mapping
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  part_number: ['part number', 'part_number', 'part no', 'part#', 'pn', 'component', 'component_number', 'component number', 'item', 'item number', 'material'],
  description: ['description', 'desc', 'object_description', 'object description', 'name', 'part description', 'item text', 'item_text_line_2'],
  quantity: ['quantity', 'qty', 'required_qty', 'required qty', 'component_quantity', 'component quantity', 'amount', 'count'],
  uom: ['uom', 'unit', 'unit of measure', 'base_unit_measure', 'base unit measure', 'component_unit', 'component unit', 'measure'],
};

interface ParsedRow {
  part_number: string;
  description: string;
  quantity: number;
  uom: string;
}

interface BomUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BomUpload = ({ open, onOpenChange }: BomUploadProps) => {
  const { selectedProject, selectedVersion } = useProject();
  const createBomLines = useCreateBomLines();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string>>({
    part_number: '',
    description: '',
    quantity: '',
    uom: '',
  });
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [bomName, setBomName] = useState('');

  const reset = () => {
    setStep('upload');
    setFileName('');
    setRawHeaders([]);
    setRawRows([]);
    setMapping({ part_number: '', description: '', quantity: '', uom: '' });
    setParsedData([]);
    setParsing(false);
    setBomName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const autoMapHeaders = (headers: string[]) => {
    const newMapping: Record<FieldKey, string> = { part_number: '', description: '', quantity: '', uom: '' };
    const lowerHeaders = headers.map(h => h.toLowerCase().trim());

    for (const field of EXPECTED_FIELDS) {
      const aliases = HEADER_ALIASES[field.key];
      const matchIndex = lowerHeaders.findIndex(h => aliases.includes(h));
      if (matchIndex !== -1) {
        newMapping[field.key] = headers[matchIndex];
      }
    }
    return newMapping;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx', 'csv'].includes(ext ?? '')) {
      toast.error('Unsupported file format. Please use .xls, .xlsx, or .csv');
      return;
    }

    setParsing(true);
    setFileName(file.name);
    setBomName(file.name.replace(/\.[^.]+$/, ''));

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

      if (jsonData.length < 2) {
        toast.error('File must contain at least a header row and one data row');
        setParsing(false);
        return;
      }

      const headers = (jsonData[0] as string[]).map(h => String(h ?? '').trim());
      const rows = jsonData.slice(1).filter(row =>
        (row as string[]).some(cell => cell != null && String(cell).trim() !== '')
      ) as string[][];

      setRawHeaders(headers);
      setRawRows(rows);

      const autoMapped = autoMapHeaders(headers);
      setMapping(autoMapped);

      // If all required fields are mapped, skip to preview
      const allRequiredMapped = EXPECTED_FIELDS
        .filter(f => f.required)
        .every(f => autoMapped[f.key] !== '');

      if (allRequiredMapped) {
        const parsed = applyMapping(headers, rows, autoMapped);
        setParsedData(parsed);
        setStep('preview');
      } else {
        setStep('map');
      }
    } catch {
      toast.error('Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const applyMapping = (headers: string[], rows: string[][], map: Record<FieldKey, string>): ParsedRow[] => {
    const getIdx = (field: FieldKey) => headers.indexOf(map[field]);

    return rows
      .map(row => {
        const pnIdx = getIdx('part_number');
        const descIdx = getIdx('description');
        const qtyIdx = getIdx('quantity');
        const uomIdx = getIdx('uom');

        const partNumber = pnIdx >= 0 ? String(row[pnIdx] ?? '').trim() : '';
        const description = descIdx >= 0 ? String(row[descIdx] ?? '').trim() : '';
        const quantity = qtyIdx >= 0 ? Number(row[qtyIdx]) || 0 : 0;
        const uom = uomIdx >= 0 ? String(row[uomIdx] ?? '').trim() : 'EA';

        return { part_number: partNumber, description, quantity, uom };
      })
      .filter(r => r.part_number !== '' && r.quantity > 0);
  };

  const handleConfirmMapping = () => {
    const requiredMissing = EXPECTED_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (requiredMissing.length > 0) {
      toast.error(`Please map required fields: ${requiredMissing.map(f => f.label).join(', ')}`);
      return;
    }
    const parsed = applyMapping(rawHeaders, rawRows, mapping);
    if (parsed.length === 0) {
      toast.error('No valid rows found after mapping. Check your column assignments.');
      return;
    }
    setParsedData(parsed);
    setStep('preview');
  };

  const handleSave = async () => {
    if (!selectedProject || !selectedVersion || parsedData.length === 0) return;

    const batchId = crypto.randomUUID();

    // Create header row (bom_level 0) representing this upload
    const headerLine = {
      project_version_id: selectedVersion.id,
      upload_batch_id: batchId,
      bom_level: 0,
      component_number: parsedData[0].part_number,
      object_description: bomName.trim() || fileName,
      required_qty: 0,
      component_quantity: 0,
    };

    // Create child rows (bom_level 1)
    const childLines = parsedData.map((row, idx) => ({
      project_version_id: selectedVersion.id,
      upload_batch_id: batchId,
      bom_level: 1,
      component_number: row.part_number,
      object_description: row.description || null,
      required_qty: row.quantity,
      component_quantity: row.quantity,
      base_unit_measure: row.uom || 'EA',
      sort_string: String(idx + 1).padStart(5, '0'),
    }));

    try {
      await createBomLines.mutateAsync([headerLine, ...childLines]);
      toast.success(`${parsedData.length} BOM lines imported`);
      handleClose();
    } catch {
      toast.error('Failed to save BOM lines');
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Upload BOM File'}
            {step === 'map' && 'Map Columns'}
            {step === 'preview' && 'Preview Import'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: File Upload */}
        {step === 'upload' && (
          <div className="space-y-4 pt-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/20 py-12 px-6 cursor-pointer transition-colors hover:bg-muted/40"
            >
              {parsing ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              )}
              <p className="text-sm text-foreground font-medium">
                {parsing ? 'Parsing...' : 'Click to select a file'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supported: .xls, .xlsx, .csv
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'map' && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Map your file columns to the expected BOM fields. File: <span className="font-mono font-medium text-foreground">{fileName}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPECTED_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {field.label} {field.required && <span className="text-accent">*</span>}
                  </Label>
                  <Select
                    value={mapping[field.key] || '__none__'}
                    onValueChange={v => setMapping(prev => ({ ...prev, [field.key]: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Skip --</SelectItem>
                      {rawHeaders.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Raw data preview */}
            <div className="rounded border border-border overflow-hidden">
              <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40">
                First 5 rows
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {rawHeaders.map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {rawHeaders.map((_, ci) => (
                          <td key={ci} className="px-2 py-1.5 text-muted-foreground">{String(row[ci] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleConfirmMapping} className="flex-1">
                Continue to Preview
              </Button>
              <Button variant="outline" onClick={() => { reset(); setStep('upload'); }}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Save */}
        {step === 'preview' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-ops-green" />
                <span><span className="font-semibold text-foreground">{parsedData.length}</span> rows parsed from <span className="font-mono">{fileName}</span></span>
              </div>
              <button onClick={() => setStep('map')} className="text-[10px] font-medium text-foreground hover:underline ml-auto">
                Re-map columns
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">BOM Name</Label>
              <Input value={bomName} onChange={e => setBomName(e.target.value)} placeholder="e.g. Main Assembly BOM" className="text-xs h-9" />
            </div>

            <div className="rounded border border-border overflow-hidden max-h-[40vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Part Number</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                    <th className="px-3 py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-mono font-medium text-foreground">{row.part_number}</td>
                      <td className="px-3 py-2 text-foreground">{row.description || '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{row.quantity}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{row.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={createBomLines.isPending} className="flex-1">
                {createBomLines.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Import {parsedData.length} Lines
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BomUpload;
