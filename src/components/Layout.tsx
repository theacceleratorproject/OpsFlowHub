import { ReactNode } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ClipboardList, ShoppingCart,
  Truck, AlertTriangle, ArrowLeftRight, FileText, LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/bom', label: 'BOM', icon: FileText },
  { path: '/materials', label: 'Materials', icon: Package },
  { path: '/tasks', label: 'Tasks', icon: ClipboardList },
  { path: '/part-requests', label: 'Requests', icon: ShoppingCart },
  { path: '/picking-orders', label: 'Picking', icon: Truck },
  { path: '/issues', label: 'Issues', icon: AlertTriangle },
];

const Layout = ({ children }: { children: ReactNode }) => {
  const { selectedProject, selectedVersion, setSelectedProject } = useProject();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSwitchProject = () => {
    setSelectedProject(null);
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="ops-header-bg sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-xs">OP</span>
              </div>
              <span className="text-primary-foreground font-semibold text-sm tracking-wide hidden sm:block">
                OpsPulse
              </span>
            </div>
            {selectedProject && selectedVersion && (
              <>
                <div className="h-4 w-px bg-primary-foreground/20" />
                <span className="text-sm text-primary-foreground/70">
                  {selectedProject.project_name} — {selectedVersion.version_name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selectedProject && (
              <button
                onClick={handleSwitchProject}
                className="flex items-center gap-1.5 text-xs text-primary-foreground/50 transition-colors hover:text-primary-foreground"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Switch Project</span>
              </button>
            )}
            {user && (
              <>
                <div className="h-4 w-px bg-primary-foreground/20" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary-foreground/60 hidden sm:inline">
                    {profile?.full_name || user.email}
                  </span>
                  {profile && (
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                      profile.role === 'admin' && "text-accent bg-accent/15",
                      profile.role === 'member' && "text-primary-foreground bg-primary-foreground/10",
                      profile.role === 'viewer' && "text-muted-foreground bg-muted-foreground/10",
                    )}>
                      {profile.role}
                    </span>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-xs text-primary-foreground/40 transition-colors hover:text-primary-foreground"
                    title="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {selectedProject && (
          <nav className="flex gap-0.5 overflow-x-auto px-4 pb-2 md:px-6">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-primary-foreground/40 hover:text-primary-foreground/70"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
