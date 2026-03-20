import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement, type ReactNode } from 'react';

// ── Supabase mock ──────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();

/**
 * Build the chainable mock so that:
 *   supabase.from('t').insert(x).select().single()
 *   supabase.from('t').update(x).eq('id', v).select().single()
 *   supabase.from('t').select('status').eq('id', v).single()
 *   supabase.from('t').select('on_hand_qty').eq('part_number', v).maybeSingle()
 * all work correctly.
 */
function resetChain() {
  mockSingle.mockReset();
  mockMaybeSingle.mockReset();
  mockSelect.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockEq.mockReset();
  mockFrom.mockReset();

  // Default: .single() resolves with data
  mockSingle.mockResolvedValue({ data: {}, error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });

  // .select() returns object with .single() and .eq()
  mockSelect.mockReturnValue({
    single: mockSingle,
    eq: mockEq,
  });

  // .eq() returns object with .select(), .single(), .maybeSingle()
  mockEq.mockReturnValue({
    select: mockSelect,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  });

  // .insert() returns object with .select()
  mockInsert.mockReturnValue({ select: mockSelect });

  // .update() returns object with .eq()
  mockUpdate.mockReturnValue({ eq: mockEq });

  // .from() returns object with .insert(), .update(), .select()
  mockFrom.mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  });
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// ── Imports (AFTER mocks) ──────────────────────────────────────────────────

import {
  useCreateECN,
  useUpdateECN,
  VALID_ECN_TRANSITIONS,
  useUpdateGateCriterion,
  useCreatePartRequest,
} from '@/hooks/use-supabase-data';

// ── Helpers ────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: qc }, children);
}

// ════════════════════════════════════════════════════════════════════════════
// 1) useCreateECN
// ════════════════════════════════════════════════════════════════════════════

describe('useCreateECN', () => {
  beforeEach(resetChain);

  const ecnPayload = {
    ecn_number: 'ECN-2025-001',
    title: 'Update housing material',
    status: 'draft' as const,
    priority: 'normal' as const,
    project_version_id: 'pv-1',
    submitted_by: 'alice@example.com',
    submitted_at: '2025-06-01T00:00:00Z',
  };

  it('calls supabase.from("ecn_notices").insert() with the correct payload', async () => {
    const returned = { ...ecnPayload, id: 'ecn-new', created_at: '2025-06-01T00:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useCreateECN(), { wrapper });

    result.current.mutate(ecnPayload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('ecn_notices');
    expect(mockInsert).toHaveBeenCalledWith(ecnPayload);
  });

  it('includes status "draft" and submitted_by in the insert', async () => {
    const returned = { ...ecnPayload, id: 'ecn-new', created_at: '2025-06-01T00:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useCreateECN(), { wrapper });

    result.current.mutate(ecnPayload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.status).toBe('draft');
    expect(insertArg.submitted_by).toBe('alice@example.com');
  });

  it('returns error when supabase insert fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });

    const { result } = renderHook(() => useCreateECN(), { wrapper });

    result.current.mutate(ecnPayload);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('insert failed');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2) useUpdateECN — status transitions
// ════════════════════════════════════════════════════════════════════════════

describe('useUpdateECN', () => {
  beforeEach(resetChain);

  it('calls supabase.from("ecn_notices").update() with correct id and fields', async () => {
    // First .from() call: fetch current status
    const statusResult = { data: { status: 'under_review' }, error: null };
    // Second .from() call: do the update
    const updateResult = {
      data: { id: 'ecn-1', status: 'approved', project_version_id: 'pv-1' },
      error: null,
    };

    // First call: select('status').eq('id',...).single()
    mockSingle.mockResolvedValueOnce(statusResult);
    // Second call: update(...).eq('id',...).select().single()
    mockSingle.mockResolvedValueOnce(updateResult);

    const { result } = renderHook(() => useUpdateECN(), { wrapper });

    result.current.mutate({
      id: 'ecn-1',
      status: 'approved',
      approved_by: 'bob@example.com',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have called from('ecn_notices') twice (fetch + update)
    expect(mockFrom).toHaveBeenCalledWith('ecn_notices');
    expect(mockUpdate).toHaveBeenCalled();
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.status).toBe('approved');
    expect(updateArg.approved_by).toBe('bob@example.com');
  });

  it('auto-sets approved_at when transitioning to "approved"', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { status: 'under_review' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'ecn-1', status: 'approved', project_version_id: 'pv-1' },
        error: null,
      });

    const { result } = renderHook(() => useUpdateECN(), { wrapper });

    result.current.mutate({
      id: 'ecn-1',
      status: 'approved',
      approved_by: 'bob@example.com',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.approved_at).toBeDefined();
    expect(typeof updateArg.approved_at).toBe('string');
  });

  it('auto-sets implementation_date when transitioning to "implemented"', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { status: 'approved' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'ecn-1', status: 'implemented', project_version_id: 'pv-1' },
        error: null,
      });

    const { result } = renderHook(() => useUpdateECN(), { wrapper });

    result.current.mutate({ id: 'ecn-1', status: 'implemented' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.implementation_date).toBeDefined();
    // Should be a YYYY-MM-DD date
    expect(updateArg.implementation_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects invalid transition: draft → implemented', async () => {
    mockSingle.mockResolvedValueOnce({ data: { status: 'draft' }, error: null });

    const { result } = renderHook(() => useUpdateECN(), { wrapper });

    result.current.mutate({ id: 'ecn-1', status: 'implemented' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Invalid status transition');
    expect(result.current.error?.message).toContain('draft');
    expect(result.current.error?.message).toContain('implemented');
  });

  it('rejects invalid transition: approved → draft', async () => {
    mockSingle.mockResolvedValueOnce({ data: { status: 'approved' }, error: null });

    const { result } = renderHook(() => useUpdateECN(), { wrapper });

    result.current.mutate({ id: 'ecn-1', status: 'draft' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Invalid status transition');
  });

  it('exports VALID_ECN_TRANSITIONS with correct allowed transitions', () => {
    expect(VALID_ECN_TRANSITIONS.draft).toEqual(['under_review']);
    expect(VALID_ECN_TRANSITIONS.under_review).toContain('approved');
    expect(VALID_ECN_TRANSITIONS.under_review).toContain('rejected');
    expect(VALID_ECN_TRANSITIONS.approved).toEqual(['implemented']);
    expect(VALID_ECN_TRANSITIONS.implemented).toEqual([]);
    expect(VALID_ECN_TRANSITIONS.rejected).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3) useUpdateGateCriterion
// ════════════════════════════════════════════════════════════════════════════

describe('useUpdateGateCriterion', () => {
  beforeEach(resetChain);

  it('calls supabase update with correct id and is_met toggle', async () => {
    const returned = { id: 'gc-1', is_met: true, gate_review_id: 'gr-1' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useUpdateGateCriterion(), { wrapper });

    result.current.mutate({ id: 'gc-1', is_met: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('gate_criteria');
    expect(mockUpdate).toHaveBeenCalledWith({ is_met: true });
    expect(mockEq).toHaveBeenCalledWith('id', 'gc-1');
  });

  it('returns error when supabase update fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } });

    const { result } = renderHook(() => useUpdateGateCriterion(), { wrapper });

    result.current.mutate({ id: 'gc-1', is_met: false });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('update failed');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 4) useCreatePartRequest
// ════════════════════════════════════════════════════════════════════════════

describe('useCreatePartRequest', () => {
  beforeEach(resetChain);

  const baseReq = {
    project_id: 'proj-1',
    version_id: 'v-1',
    part_number: 'P-100',
    requested_qty: 5,
    requested_by: 'alice@example.com',
    urgency: 'Standard',
  };

  it('calls supabase insert with correct payload', async () => {
    // Inventory check: part has stock → keep urgency as-is
    mockMaybeSingle.mockResolvedValueOnce({ data: { on_hand_qty: 10 }, error: null });
    const returned = { ...baseReq, id: 'pr-new', created_at: '2025-06-01T00:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useCreatePartRequest(), { wrapper });

    result.current.mutate(baseReq);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFrom).toHaveBeenCalledWith('part_requests');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('auto-sets urgency to "Critical" when inventory on_hand is 0', async () => {
    // Inventory check returns on_hand_qty: 0
    mockMaybeSingle.mockResolvedValueOnce({ data: { on_hand_qty: 0 }, error: null });
    const returned = { ...baseReq, id: 'pr-new', urgency: 'Critical', created_at: '2025-06-01T00:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useCreatePartRequest(), { wrapper });

    result.current.mutate({ ...baseReq, urgency: 'Standard' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.urgency).toBe('Critical');
  });

  it('auto-sets urgency to "Critical" when no inventory record exists', async () => {
    // Inventory check returns null (no record found)
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const returned = { ...baseReq, id: 'pr-new', urgency: 'Critical', created_at: '2025-06-01T00:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useCreatePartRequest(), { wrapper });

    result.current.mutate({ ...baseReq, urgency: 'Standard' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.urgency).toBe('Critical');
  });

  it('keeps user-provided urgency when inventory on_hand > 0', async () => {
    // Inventory check: has stock
    mockMaybeSingle.mockResolvedValueOnce({ data: { on_hand_qty: 50 }, error: null });
    const returned = { ...baseReq, id: 'pr-new', created_at: '2025-06-01T00:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useCreatePartRequest(), { wrapper });

    result.current.mutate(baseReq);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.urgency).toBe('Standard');
  });

  it('does not override "Expedite" or "Critical" urgency with inventory check', async () => {
    // User explicitly chose 'Expedite' — skip inventory check
    const expediteReq = { ...baseReq, urgency: 'Expedite' };
    const returned = { ...expediteReq, id: 'pr-new', created_at: '2025-06-01T00:00:00Z' };
    mockSingle.mockResolvedValueOnce({ data: returned, error: null });

    const { result } = renderHook(() => useCreatePartRequest(), { wrapper });

    result.current.mutate(expediteReq);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should NOT have queried inventory since urgency was already Expedite
    const fromCalls = mockFrom.mock.calls.map(c => c[0]);
    expect(fromCalls).not.toContain('inventory');

    const insertArg = mockInsert.mock.calls[0][0];
    expect(insertArg.urgency).toBe('Expedite');
  });
});
