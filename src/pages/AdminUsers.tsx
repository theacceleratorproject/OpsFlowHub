import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Save, ShieldAlert, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/contexts/AuthContext';
import { useProfiles, useUpdateUserRole, useUpdateProfile } from '@/hooks/use-supabase-data';
import type { ProfileRow } from '@/hooks/use-supabase-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { UserRole } from '@/contexts/AuthContext';

const ALL_ROLES: UserRole[] = [
  'admin',
  'ops_manager',
  'npi_engineer',
  'planner',
  'quality_engineer',
  'executive',
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  ops_manager: 'Ops Manager',
  npi_engineer: 'NPI Engineer',
  planner: 'Planner',
  quality_engineer: 'Quality Engineer',
  executive: 'Executive',
};

const getInitials = (email: string, fullName: string | null) => {
  if (fullName) {
    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }
  return email
    .split('@')[0]
    .split(/[._-]/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
};

// Tracks per-row edits
interface RowEdits {
  role?: UserRole;
  full_name?: string;
}

const AdminUsers = () => {
  const { can } = useRole();
  const navigate = useNavigate();
  const { data: profiles = [], isLoading } = useProfiles();
  const updateRole = useUpdateUserRole();
  const updateProfile = useUpdateProfile();
  const [edits, setEdits] = useState<Record<string, RowEdits>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Redirect non-admins
  useEffect(() => {
    if (!can('manage_users')) {
      navigate('/dashboard', { replace: true });
    }
  }, [can, navigate]);

  if (!can('manage_users')) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-accent/30 bg-accent/5 p-4 text-sm text-accent">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        You don&apos;t have permission to access this page.
      </div>
    );
  }

  const setEdit = (id: string, patch: Partial<RowEdits>) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const hasEdits = (profile: ProfileRow) => {
    const e = edits[profile.id];
    if (!e) return false;
    return (e.role !== undefined && e.role !== profile.role) ||
           (e.full_name !== undefined && e.full_name !== (profile.full_name ?? ''));
  };

  const handleSave = async (profile: ProfileRow) => {
    const e = edits[profile.id];
    if (!e) return;

    setSavingId(profile.id);
    try {
      const promises: Promise<unknown>[] = [];
      if (e.role !== undefined && e.role !== profile.role) {
        promises.push(updateRole.mutateAsync({ id: profile.id, role: e.role }));
      }
      if (e.full_name !== undefined && e.full_name !== (profile.full_name ?? '')) {
        promises.push(updateProfile.mutateAsync({ id: profile.id, full_name: e.full_name.trim() }));
      }
      await Promise.all(promises);
      setEdits(prev => {
        const next = { ...prev };
        delete next[profile.id];
        return next;
      });
      toast.success(`Updated ${profile.email.split('@')[0]}`);
    } catch (err) {
      console.error('[AdminUsers]', err);
      toast.error('Failed to save changes');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">User Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profiles.length} user{profiles.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite User
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-10" />
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Email</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Role</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Joined</th>
                  <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground uppercase tracking-wider text-[10px] w-20" />
                </tr>
              </thead>
              <tbody>
                {profiles.map(profile => {
                  const editState = edits[profile.id];
                  const currentRole = (editState?.role ?? profile.role) as UserRole;
                  const currentName = editState?.full_name ?? profile.full_name ?? '';
                  const dirty = hasEdits(profile);
                  const isSaving = savingId === profile.id;

                  return (
                    <tr key={profile.id} className="data-table-row">
                      {/* Avatar */}
                      <td className="px-3 py-2.5">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className={cn(
                            "text-[10px] font-semibold",
                            currentRole === 'admin' ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                          )}>
                            {getInitials(profile.email, profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </td>

                      {/* Name (inline editable) */}
                      <td className="px-3 py-2.5">
                        <input
                          type="text"
                          value={currentName}
                          onChange={e => setEdit(profile.id, { full_name: e.target.value })}
                          placeholder="Full name..."
                          className="w-full bg-transparent border-0 border-b border-transparent hover:border-border focus:border-ring focus:outline-none text-xs text-foreground py-0.5 transition-colors"
                        />
                      </td>

                      {/* Email */}
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{profile.email}</td>

                      {/* Role */}
                      <td className="px-3 py-2.5">
                        <Select
                          value={currentRole}
                          onValueChange={v => setEdit(profile.id, { role: v as UserRole })}
                        >
                          <SelectTrigger className="h-7 w-[150px] text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map(r => (
                              <SelectItem key={r} value={r} className="text-xs">
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Joined date */}
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </td>

                      {/* Save */}
                      <td className="px-3 py-2.5 text-center">
                        {dirty && (
                          <button
                            onClick={() => handleSave(profile)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 rounded bg-ops-green/15 px-2.5 py-1 text-[10px] font-semibold text-ops-green transition-colors hover:bg-ops-green/25 disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-md border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
              <p>
                User invitations require the <span className="font-mono text-foreground">supabase.auth.admin</span> API,
                which is only available server-side with a service-role key.
              </p>
              <p>To invite a new user:</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Go to your <span className="font-medium text-foreground">Supabase Dashboard</span></li>
                <li>Navigate to <span className="font-mono text-foreground">Authentication → Users</span></li>
                <li>Click <span className="font-medium text-foreground">Invite user</span> and enter their email</li>
                <li>Once they sign in, their profile will appear here for role assignment</li>
              </ol>
            </div>
            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full rounded bg-muted px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
            >
              Got it
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminUsers;
