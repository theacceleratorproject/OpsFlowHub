import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'ops_manager'
  | 'npi_engineer'
  | 'planner'
  | 'quality_engineer'
  | 'executive';

export type Permission =
  | 'approve_ecn'
  | 'reject_ecn'
  | 'implement_ecn'
  | 'edit_bom'
  | 'delete_records'
  | 'manage_users'
  | 'view_all_projects'
  | 'approve_gate'
  | 'create_part_request'
  | 'view_financials';

const ALL_PERMISSIONS: readonly Permission[] = [
  'approve_ecn', 'reject_ecn', 'implement_ecn', 'edit_bom',
  'delete_records', 'manage_users', 'view_all_projects',
  'approve_gate', 'create_part_request', 'view_financials',
] as const;

/** Permissions granted to each role (admin gets everything). */
const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: ALL_PERMISSIONS,
  ops_manager: ['approve_ecn', 'approve_gate', 'view_all_projects', 'view_financials'],
  npi_engineer: ['edit_bom', 'create_part_request'],
  planner: ['create_part_request'],
  quality_engineer: ['approve_ecn', 'reject_ecn', 'approve_gate'],
  executive: ['view_all_projects', 'view_financials'],
};

// ── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  // Existing fields (backward-compatible)
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;

  // RBAC fields
  role: UserRole | null;
  isAdmin: boolean;
  canApproveECN: boolean;
  canEditBOM: boolean;
  canManageUsers: boolean;
  canViewExecutiveDashboard: boolean;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  // Fetch role from the profiles table
  const fetchRole = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles' as never)
      .select('role')
      .eq('id' as never, userId as never)
      .single();

    if (error) {
      console.error('[AuthContext] Failed to fetch profile role', error);
      setRole(null);
      return;
    }

    setRole((data as { role: UserRole } | null)?.role ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchRole(s.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchRole(s.user.id);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  // Memoised permission set for the current role
  const permissionSet = useMemo<ReadonlySet<Permission>>(
    () => new Set(role ? ROLE_PERMISSIONS[role] : []),
    [role],
  );

  const can = useCallback(
    (permission: Permission) => permissionSet.has(permission),
    [permissionSet],
  );

  // Convenience booleans
  const isAdmin = role === 'admin';
  const canApproveECN = can('approve_ecn');
  const canEditBOM = can('edit_bom');
  const canManageUsers = can('manage_users');
  const canViewExecutiveDashboard = can('view_financials');

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextType>(() => ({
    user, session, loading, signIn, signUp, signOut,
    role, isAdmin, canApproveECN, canEditBOM, canManageUsers, canViewExecutiveDashboard, can,
  }), [user, session, loading, role, isAdmin, canApproveECN, canEditBOM, canManageUsers, canViewExecutiveDashboard, can]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hooks ────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

/** Convenience hook that returns only RBAC-related fields. */
export const useRole = () => {
  const { role, isAdmin, canApproveECN, canEditBOM, canManageUsers, canViewExecutiveDashboard, can } = useAuth();
  return { role, isAdmin, canApproveECN, canEditBOM, canManageUsers, canViewExecutiveDashboard, can };
};
