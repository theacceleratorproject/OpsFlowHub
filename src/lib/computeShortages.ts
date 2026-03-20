/**
 * Pure computation: given BOM lines, inventory, work order lines, and suppliers,
 * produce a sorted list of shortage alerts.
 *
 * Extracted from useShortageAlerts so the logic can be unit-tested without
 * mocking Supabase or React Query.
 */

export interface AffectedWorkOrder {
  id: string;
  work_order_number: string;
  created_at: string;
  status: string;
}

export interface ShortageAlert {
  part_number: string;
  part_name: string;
  on_hand: number;
  required: number;
  shortfall: number;
  affected_work_orders: AffectedWorkOrder[];
  supplier_name: string | null;
  lead_time_days: number | null;
}

export interface BomLineInput {
  component_number: string;
  object_description: string | null;
  required_qty: number;
  bom_level: number;
}

export interface InventoryInput {
  part_number: string;
  on_hand_qty: number | null;
}

export interface WorkOrderLineInput {
  part_number: string;
  work_orders: {
    id: string;
    work_order_number: string;
    created_at: string;
    status: string;
  };
}

export interface SupplierInput {
  part_number: string;
  supplier_name: string;
  lead_time_days: number | null;
}

export function computeShortages(
  bom: BomLineInput[],
  inv: InventoryInput[],
  wol: WorkOrderLineInput[],
  sup: SupplierInput[],
): ShortageAlert[] {
  // Aggregate inventory by part_number
  const invMap = new Map<string, number>();
  inv.forEach(i => {
    invMap.set(i.part_number, (invMap.get(i.part_number) ?? 0) + (i.on_hand_qty ?? 0));
  });

  // Aggregate BOM: deduplicate by component_number, sum required_qty, capture description
  const bomMap = new Map<string, { required: number; name: string }>();
  bom.forEach(l => {
    if (l.bom_level === 0) return; // skip top-level assembly row
    const existing = bomMap.get(l.component_number);
    if (existing) {
      existing.required += Number(l.required_qty);
    } else {
      bomMap.set(l.component_number, {
        required: Number(l.required_qty),
        name: l.object_description ?? l.component_number,
      });
    }
  });

  // Map part_number → work orders that include it
  const woByPart = new Map<string, Map<string, AffectedWorkOrder>>();
  wol.forEach(line => {
    const wo = line.work_orders;
    if (!woByPart.has(line.part_number)) woByPart.set(line.part_number, new Map());
    const map = woByPart.get(line.part_number)!;
    if (!map.has(wo.id)) {
      map.set(wo.id, {
        id: wo.id,
        work_order_number: wo.work_order_number,
        created_at: wo.created_at,
        status: wo.status,
      });
    }
  });

  // Best supplier per part (shortest lead time)
  const supMap = new Map<string, { supplier_name: string; lead_time_days: number | null }>();
  sup.forEach(s => {
    const existing = supMap.get(s.part_number);
    if (!existing || (s.lead_time_days ?? Infinity) < (existing.lead_time_days ?? Infinity)) {
      supMap.set(s.part_number, { supplier_name: s.supplier_name, lead_time_days: s.lead_time_days });
    }
  });

  // Build shortage alerts
  const alerts: ShortageAlert[] = [];
  bomMap.forEach(({ required, name }, partNumber) => {
    const onHand = invMap.get(partNumber) ?? 0;
    if (onHand >= required) return; // no shortage

    const shortfall = required - onHand;
    const affectedWOs = woByPart.get(partNumber);
    const supplier = supMap.get(partNumber);

    alerts.push({
      part_number: partNumber,
      part_name: name,
      on_hand: onHand,
      required,
      shortfall,
      affected_work_orders: affectedWOs ? Array.from(affectedWOs.values()) : [],
      supplier_name: supplier?.supplier_name ?? null,
      lead_time_days: supplier?.lead_time_days ?? null,
    });
  });

  // Sort: largest shortfall first, then by nearest work order date
  alerts.sort((a, b) => {
    if (b.shortfall !== a.shortfall) return b.shortfall - a.shortfall;
    const aDate = a.affected_work_orders[0]?.created_at ?? '';
    const bDate = b.affected_work_orders[0]?.created_at ?? '';
    return aDate.localeCompare(bDate);
  });

  return alerts;
}
