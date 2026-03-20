import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';

// Build mock query builders — each returns { data, error } and supports .eq()/.select()/.order()
const createMockQuery = (data: any[] = []) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: any) => resolve({ data, error: null }),
  };
  // Make it a thenable so Promise.all works
  chain[Symbol.toStringTag] = 'Promise';
  return chain;
};

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

import { useShortageAlerts } from '@/hooks/use-supabase-data';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useShortageAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when disabled (no versionId)', async () => {
    const { result } = renderHook(() => useShortageAlerts(undefined), {
      wrapper: createWrapper(),
    });

    // Query is disabled, data should be the default (undefined)
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns empty alerts when bom_lines is empty', async () => {
    // When bom_lines returns empty, no shortage can be computed
    mockFrom.mockImplementation((_table: string) => {
      return createMockQuery([]); // all tables return empty
    });

    const { result } = renderHook(() => useShortageAlerts('version-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});
