import { describe, it, expect } from 'vitest';
import { computeShortages } from '@/lib/computeShortages';
import type { BomLineInput, InventoryInput, WorkOrderLineInput, SupplierInput } from '@/lib/computeShortages';
import { computeGateReadiness } from '@/lib/computeGateReadiness';
import type { GateCriterion } from '@/lib/computeGateReadiness';

// ════════════════════════════════════════════════════════════════════════════
// 1) computeShortages
// ════════════════════════════════════════════════════════════════════════════

describe('computeShortages', () => {
  const bom = (num: string, qty: number, desc?: string, level = 1): BomLineInput => ({
    component_number: num,
    required_qty: qty,
    object_description: desc ?? num,
    bom_level: level,
  });

  const inv = (num: string, qty: number): InventoryInput => ({
    part_number: num,
    on_hand_qty: qty,
  });

  const wo = (partNum: string, woId: string, woNum: string, date = '2025-01-01'): WorkOrderLineInput => ({
    part_number: partNum,
    work_orders: { id: woId, work_order_number: woNum, created_at: date, status: 'Open' },
  });

  const sup = (partNum: string, name: string, lead: number | null = null): SupplierInput => ({
    part_number: partNum,
    supplier_name: name,
    lead_time_days: lead,
  });

  it('returns empty array for empty BOM', () => {
    const result = computeShortages([], [], [], []);
    expect(result).toEqual([]);
  });

  it('does not flag part when on_hand >= required', () => {
    const result = computeShortages(
      [bom('P-100', 10)],
      [inv('P-100', 15)],
      [],
      [],
    );
    expect(result).toEqual([]);
  });

  it('flags part when on_hand < required with correct shortfall', () => {
    const result = computeShortages(
      [bom('P-200', 20, 'Widget')],
      [inv('P-200', 8)],
      [],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].part_number).toBe('P-200');
    expect(result[0].part_name).toBe('Widget');
    expect(result[0].on_hand).toBe(8);
    expect(result[0].required).toBe(20);
    expect(result[0].shortfall).toBe(12);
  });

  it('part with on_hand = 0 has shortfall equal to required', () => {
    const result = computeShortages(
      [bom('P-300', 50, 'Bolt')],
      [], // no inventory at all
      [],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].on_hand).toBe(0);
    expect(result[0].shortfall).toBe(50);
  });

  it('sorts by largest shortfall first', () => {
    const result = computeShortages(
      [
        bom('P-A', 10, 'Small'),  // shortfall 10
        bom('P-B', 100, 'Large'), // shortfall 100
        bom('P-C', 30, 'Mid'),   // shortfall 30
      ],
      [], // no inventory → shortfall = required
      [],
      [],
    );

    expect(result).toHaveLength(3);
    expect(result[0].part_number).toBe('P-B');
    expect(result[0].shortfall).toBe(100);
    expect(result[1].part_number).toBe('P-C');
    expect(result[1].shortfall).toBe(30);
    expect(result[2].part_number).toBe('P-A');
    expect(result[2].shortfall).toBe(10);
  });

  it('links affected_work_orders correctly', () => {
    const result = computeShortages(
      [bom('P-400', 20)],
      [inv('P-400', 5)],
      [
        wo('P-400', 'wo-1', 'WO-001', '2025-03-01'),
        wo('P-400', 'wo-2', 'WO-002', '2025-04-01'),
      ],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].affected_work_orders).toHaveLength(2);
    const woNums = result[0].affected_work_orders.map(w => w.work_order_number);
    expect(woNums).toContain('WO-001');
    expect(woNums).toContain('WO-002');
  });

  it('skips bom_level 0 (top-level assembly) rows', () => {
    const result = computeShortages(
      [
        bom('ASSY-TOP', 1, 'Assembly', 0), // level 0 → skip
        bom('P-SUB', 10, 'Sub Part', 1),   // level 1 → include
      ],
      [],
      [],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].part_number).toBe('P-SUB');
  });

  it('deduplicates BOM lines by component_number and sums required_qty', () => {
    const result = computeShortages(
      [
        bom('P-500', 5, 'Screw'),
        bom('P-500', 7, 'Screw'),
      ],
      [inv('P-500', 3)],
      [],
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0].required).toBe(12); // 5 + 7
    expect(result[0].shortfall).toBe(9); // 12 - 3
  });

  it('picks supplier with shortest lead time', () => {
    const result = computeShortages(
      [bom('P-600', 10)],
      [],
      [],
      [
        sup('P-600', 'Slow Corp', 45),
        sup('P-600', 'Fast Ltd', 7),
        sup('P-600', 'Mid Inc', 20),
      ],
    );

    expect(result).toHaveLength(1);
    expect(result[0].supplier_name).toBe('Fast Ltd');
    expect(result[0].lead_time_days).toBe(7);
  });

  it('returns null supplier when none provided', () => {
    const result = computeShortages(
      [bom('P-700', 10)],
      [],
      [],
      [],
    );

    expect(result[0].supplier_name).toBeNull();
    expect(result[0].lead_time_days).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2) computeGateReadiness
// ════════════════════════════════════════════════════════════════════════════

describe('computeGateReadiness', () => {
  const criterion = (id: string, met: boolean): GateCriterion => ({ id, is_met: met });

  it('returns 0% for empty criteria list', () => {
    expect(computeGateReadiness([])).toBe(0);
  });

  it('returns 100% when all criteria are met', () => {
    const criteria = [
      criterion('1', true),
      criterion('2', true),
      criterion('3', true),
    ];
    expect(computeGateReadiness(criteria)).toBe(100);
  });

  it('returns 0% when no criteria are met', () => {
    const criteria = [
      criterion('1', false),
      criterion('2', false),
      criterion('3', false),
    ];
    expect(computeGateReadiness(criteria)).toBe(0);
  });

  it('computes 5/8 met as 63% (rounded)', () => {
    // 5/8 = 0.625 → Math.round(62.5) = 63 (banker's rounding in JS is not used; Math.round(62.5) = 63)
    const criteria = [
      criterion('1', true),
      criterion('2', true),
      criterion('3', false),
      criterion('4', true),
      criterion('5', false),
      criterion('6', true),
      criterion('7', false),
      criterion('8', true),
    ];
    expect(computeGateReadiness(criteria)).toBe(63);
  });

  it('updates correctly when adding a met criterion', () => {
    const before = [
      criterion('1', true),
      criterion('2', false),
    ];
    expect(computeGateReadiness(before)).toBe(50);

    // Mark the second criterion as met
    const after = before.map(c => c.id === '2' ? { ...c, is_met: true } : c);
    expect(computeGateReadiness(after)).toBe(100);
  });

  it('returns 50% for 1/2 met', () => {
    const criteria = [
      criterion('1', true),
      criterion('2', false),
    ];
    expect(computeGateReadiness(criteria)).toBe(50);
  });

  it('returns 100% for single met criterion', () => {
    expect(computeGateReadiness([criterion('1', true)])).toBe(100);
  });
});
