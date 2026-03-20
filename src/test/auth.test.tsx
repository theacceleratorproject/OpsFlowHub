import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mock ──────────────────────────────────────────────────────────

let authStateCallback: ((event: string, session: any) => void) | null = null;

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
      getSession: (...args: any[]) => mockGetSession(...args),
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// ── Framer-motion mock ─────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Sonner mock ────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ── Imports (AFTER mocks) ──────────────────────────────────────────────────

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/contexts/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────

const FAKE_USER = { id: 'user-1', email: 'alice@example.com' };
const FAKE_SESSION = { user: FAKE_USER };

const createProfileQuery = (role: string) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
    }),
  }),
});

function setupSupabaseMock(opts: {
  session?: any;
  profileRole?: string;
}) {
  const { session = null, profileRole = 'npi_engineer' } = opts;

  mockGetSession.mockResolvedValue({ data: { session } });
  mockOnAuthStateChange.mockImplementation((cb: any) => {
    authStateCallback = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  mockSignOut.mockResolvedValue({ error: null });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return createProfileQuery(profileRole);
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) };
  });
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithAuth(ui: React.ReactElement, opts?: { session?: any; profileRole?: string }) {
  setupSupabaseMock({ session: opts?.session ?? null, profileRole: opts?.profileRole });
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
}

// Component that displays auth state for testing
const AuthDisplay = () => {
  const { user, loading, can, role } = useAuth();
  if (loading) return <div data-testid="loading">Loading</div>;
  return (
    <div data-testid="auth-display">
      <span data-testid="user-email">{user?.email ?? 'none'}</span>
      <span data-testid="role">{role ?? 'none'}</span>
      <span data-testid="can-approve-ecn">{String(can('approve_ecn'))}</span>
      <span data-testid="can-edit-bom">{String(can('edit_bom'))}</span>
      <span data-testid="can-manage-users">{String(can('manage_users'))}</span>
      <span data-testid="can-delete-records">{String(can('delete_records'))}</span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// 1) AuthContext
// ════════════════════════════════════════════════════════════════════════════

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  it('signIn calls supabase.auth.signInWithPassword with correct args', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    const Trigger = () => {
      const { signIn } = useAuth();
      return <button onClick={() => signIn('test@acme.io', 's3cret')}>Login</button>;
    };

    renderWithAuth(<Trigger />);

    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());
    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@acme.io',
      password: 's3cret',
    });
  });

  it('signOut clears user state', async () => {
    renderWithAuth(<AuthDisplay />, { session: FAKE_SESSION, profileRole: 'admin' });

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('alice@example.com'));

    // Simulate sign-out via auth state change
    await act(async () => {
      authStateCallback?.('SIGNED_OUT', null);
    });

    await waitFor(() => expect(screen.getByTestId('user-email')).toHaveTextContent('none'));
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('none'));
  });

  it('fetches role from profiles table after login', async () => {
    renderWithAuth(<AuthDisplay />, { session: FAKE_SESSION, profileRole: 'ops_manager' });

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ops_manager'));

    // Verify profiles table was queried
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('can("approve_ecn") returns true for quality_engineer', async () => {
    renderWithAuth(<AuthDisplay />, { session: FAKE_SESSION, profileRole: 'quality_engineer' });

    await waitFor(() => expect(screen.getByTestId('can-approve-ecn')).toHaveTextContent('true'));
  });

  it('can("approve_ecn") returns false for npi_engineer', async () => {
    renderWithAuth(<AuthDisplay />, { session: FAKE_SESSION, profileRole: 'npi_engineer' });

    await waitFor(() => expect(screen.getByTestId('can-approve-ecn')).toHaveTextContent('false'));
  });

  it('admin role has all permissions', async () => {
    renderWithAuth(<AuthDisplay />, { session: FAKE_SESSION, profileRole: 'admin' });

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('admin'));
    expect(screen.getByTestId('can-approve-ecn')).toHaveTextContent('true');
    expect(screen.getByTestId('can-edit-bom')).toHaveTextContent('true');
    expect(screen.getByTestId('can-manage-users')).toHaveTextContent('true');
    expect(screen.getByTestId('can-delete-records')).toHaveTextContent('true');
  });

  it('executive role cannot edit BOM or manage users', async () => {
    renderWithAuth(<AuthDisplay />, { session: FAKE_SESSION, profileRole: 'executive' });

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('executive'));
    expect(screen.getByTestId('can-edit-bom')).toHaveTextContent('false');
    expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false');
    expect(screen.getByTestId('can-delete-records')).toHaveTextContent('false');
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2) Route guards (RequireAuth)
// ════════════════════════════════════════════════════════════════════════════

// Inline RequireAuth to keep tests self-contained (same logic as App.tsx)
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div data-testid="loading">Loading</div>;
  if (!user) return <MemoryRouter initialEntries={['/login']}><div data-testid="redirect-login">Redirected to /login</div></MemoryRouter>;
  return <>{children}</>;
};

describe('Route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  it('unauthenticated user sees redirect to /login', async () => {
    renderWithAuth(
      <RequireAuth>
        <div data-testid="protected">Protected content</div>
      </RequireAuth>,
      { session: null },
    );

    await waitFor(() => expect(screen.getByTestId('redirect-login')).toBeInTheDocument());
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });

  it('authenticated user sees protected children', async () => {
    renderWithAuth(
      <RequireAuth>
        <div data-testid="protected">Protected content</div>
      </RequireAuth>,
      { session: FAKE_SESSION, profileRole: 'npi_engineer' },
    );

    await waitFor(() => expect(screen.getByTestId('protected')).toBeInTheDocument());
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('shows loading state while auth is initializing', () => {
    // Make getSession never resolve to keep loading=true
    mockGetSession.mockReturnValue(new Promise(() => {}));
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <RequireAuth>
            <div data-testid="protected">Protected</div>
          </RequireAuth>
        </AuthProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).not.toBeInTheDocument();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 3) AdminUsers page
// ════════════════════════════════════════════════════════════════════════════

// Mock the data hooks used by AdminUsers
const mockProfiles = vi.fn();
const mockUpdateRole = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('@/hooks/use-supabase-data', () => ({
  useProfiles: () => mockProfiles(),
  useUpdateUserRole: () => ({ mutateAsync: mockUpdateRole }),
  useUpdateProfile: () => ({ mutateAsync: mockUpdateProfile }),
}));

import AdminUsers from '@/pages/AdminUsers';

/**
 * In production, RequireAuth blocks rendering until AuthProvider finishes
 * loading (loading=false). Without that gate, AdminUsers renders with
 * role=null, can() returns false, and the useEffect redirect fires before
 * the role is resolved. This wrapper replicates that production behavior.
 */
const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { loading } = useAuth();
  if (loading) return <div data-testid="auth-loading">Loading auth...</div>;
  return <>{children}</>;
};

function renderAdminUsers(role: UserRole) {
  setupSupabaseMock({ session: FAKE_SESSION, profileRole: role });
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin/users']}>
          <Routes>
            <Route path="/admin/users" element={<AuthGate><AdminUsers /></AuthGate>} />
            <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('AdminUsers page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  it('non-admin user redirects to /dashboard', async () => {
    mockProfiles.mockReturnValue({ data: [], isLoading: false });

    renderAdminUsers('npi_engineer');

    // npi_engineer cannot manage_users → useEffect navigates to /dashboard
    await waitFor(() =>
      expect(screen.getByTestId('dashboard')).toBeInTheDocument(),
    );
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });

  it('executive user redirects to /dashboard (not admin)', async () => {
    mockProfiles.mockReturnValue({ data: [], isLoading: false });

    renderAdminUsers('executive');

    await waitFor(() =>
      expect(screen.getByTestId('dashboard')).toBeInTheDocument(),
    );
  });

  it('admin user sees the user management heading', async () => {
    mockProfiles.mockReturnValue({
      data: [
        { id: 'u1', email: 'alice@acme.io', full_name: 'Alice Smith', role: 'admin', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        { id: 'u2', email: 'bob@acme.io', full_name: null, role: 'npi_engineer', created_at: '2025-02-15T00:00:00Z', updated_at: '2025-02-15T00:00:00Z' },
      ],
      isLoading: false,
    });

    renderAdminUsers('admin');

    await waitFor(() =>
      expect(screen.getByText('User Management')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('admin user sees profile rows in the table', async () => {
    mockProfiles.mockReturnValue({
      data: [
        { id: 'u1', email: 'alice@acme.io', full_name: 'Alice Smith', role: 'admin', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
        { id: 'u2', email: 'bob@acme.io', full_name: null, role: 'npi_engineer', created_at: '2025-02-15T00:00:00Z', updated_at: '2025-02-15T00:00:00Z' },
      ],
      isLoading: false,
    });

    renderAdminUsers('admin');

    await waitFor(() => expect(screen.getByText('alice@acme.io')).toBeInTheDocument());
    expect(screen.getByText('bob@acme.io')).toBeInTheDocument();
    expect(screen.getByText('2 users registered')).toBeInTheDocument();
  });

  it('admin user sees Invite User button', async () => {
    mockProfiles.mockReturnValue({ data: [], isLoading: false });

    renderAdminUsers('admin');

    await waitFor(() =>
      expect(screen.getByText('Invite User')).toBeInTheDocument(),
    );
  });
});
