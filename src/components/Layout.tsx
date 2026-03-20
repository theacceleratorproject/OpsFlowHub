import { ReactNode } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useShortageAlerts, useProjects } from '@/hooks/use-supabase-data';
import type { ProjectRow, ProjectVersionRow } from '@/hooks/use-supabase-data';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ClipboardList, ShoppingCart,
  Truck, AlertTriangle, FileText, LogOut, ShieldCheck,
  AlertOctagon, FileWarning, ChevronDown, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { ProjectMenuEntry } from '@/components/layout/ProjectMenuEntry';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/gate-readiness', label: 'Gates', icon: ShieldCheck },
  { path: '/shortages', label: 'Shortages', icon: AlertOctagon },
  { path: '/ecns', label: 'ECNs', icon: FileWarning },
  { path: '/tasks', label: 'Tasks', icon: ClipboardList },
  { path: '/bom', label: 'BOM', icon: FileText },
  { path: '/materials', label: 'Materials', icon: Package },
  { path: '/part-requests', label: 'Requests', icon: ShoppingCart },
  { path: '/picking-orders', label: 'Picking', icon: Truck },
  { path: '/issues', label: 'Issues', icon: AlertTriangle },
];

// Nav paths hidden for the executive role
const EXECUTIVE_HIDDEN_PATHS = new Set(['/tasks', '/bom', '/materials', '/part-requests', '/picking-orders']);

const Layout = ({ children }: { children: ReactNode }) => {
  const { selectedProject, selectedVersion, setSelectedProject, setSelectedVersion } = useProject();
  const { user, signOut } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: shortageAlerts = [] } = useShortageAlerts(selectedVersion?.id);

  const { can } = useRole();

  const visibleNavItems = (() => {
    let items = role === 'executive'
      ? navItems.filter(item => !EXECUTIVE_HIDDEN_PATHS.has(item.path))
      : [...navItems];
    if (can('manage_users')) {
      items = [...items, { path: '/admin/users', label: 'Users', icon: Users }];
    }
    return items;
  })();

  // Data for project/version selector
  const { data: projects = [] } = useProjects();

  const handleSelectVersion = (project: ProjectRow, version: ProjectVersionRow) => {
    setSelectedProject(project);
    setSelectedVersion(version);
    navigate('/dashboard');
  };

  const handleSwitchProject = () => {
    setSelectedProject(null);
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const initials = user?.email
    ? user.email
        .split('@')[0]
        .split(/[._-]/)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

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

            {/* Project / Version selector */}
            {selectedProject && selectedVersion && (
              <>
                <div className="h-4 w-px bg-primary-foreground/20" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                      {selectedProject.project_name} — {selectedVersion.version_name}
                      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Switch Project &amp; Version
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {projects.map(project => (
                      <ProjectMenuEntry
                        key={project.id}
                        project={project}
                        isCurrentProject={project.id === selectedProject.id}
                        currentVersionId={selectedVersion.id}
                        onSelect={handleSelectVersion}
                      />
                    ))}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSwitchProject}
                      className="text-xs cursor-pointer text-muted-foreground"
                    >
                      All Projects...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-7 w-7 cursor-pointer">
                    <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  {role && (
                    <p className="text-[10px] font-medium text-muted-foreground/70 mt-0.5 capitalize">
                      {role.replace(/_/g, ' ')}
                    </p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-xs cursor-pointer">
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {selectedProject && (
          <nav className="flex gap-0.5 overflow-x-auto px-4 pb-2 md:px-6">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const showBadge = item.path === '/shortages' && shortageAlerts.length > 0;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "relative flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-primary-foreground/40 hover:text-primary-foreground/70"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                  {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
                  )}
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
