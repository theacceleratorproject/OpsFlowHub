import { useProject } from '@/contexts/ProjectContext';
import { useBomLines, useSuppliers, useInventory, useTasks, usePartRequests, usePickingOrders, useIssues } from '@/hooks/use-supabase-data';
import { motion } from 'framer-motion';
import { Package, ClipboardList, ShoppingCart, Truck, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

const phaseOrder = ['MP', 'EVT', 'DVT', 'PPVT', 'Production'] as const;

const Dashboard = () => {
  const { selectedProject, selectedVersion } = useProject();

  const versionId = selectedVersion?.id;
  const { data: allLines = [], isLoading: linesLoading } = useBomLines(versionId);
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory(versionId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(versionId);
  const { data: requests = [], isLoading: requestsLoading } = usePartRequests(versionId);
  const { data: picks = [], isLoading: picksLoading } = usePickingOrders(versionId);
  const { data: issues = [], isLoading: issuesLoading } = useIssues(versionId);

  const isLoading = linesLoading || suppliersLoading || inventoryLoading || tasksLoading || requestsLoading || picksLoading || issuesLoading;

  const inventoryByPart = useMemo(() => {
    const map = new Map<string, typeof inventory[0]>();
    inventory.forEach(i => map.set(i.part_number, i));
    return map;
  }, [inventory]);

  const materialStats = useMemo(() => {
    const parts = allLines.filter(l => l.bom_level > 0);
    let critical = 0;
    let short = 0;
    parts.forEach(l => {
      const inv = inventoryByPart.get(l.component_number);
      if (!inv) return;
      const onHand = inv.on_hand_qty ?? 0;
      const onOrder = inv.on_order_qty ?? 0;
      const variance = Number(l.required_qty) - onHand - onOrder;
      if (variance > 0 && onHand === 0) critical++;
      else if (variance > 0) short++;
    });
    return { critical, short };
  }, [allLines, inventoryByPart]);

  if (!selectedProject || !selectedVersion) return null;

  const completedTasks = tasks.filter(t => t.status === 'Complete').length;
  const taskPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const openRequests = requests.filter(r => r.status === 'Pending').length;
  const pendingPicks = picks.filter(p => p.status === 'Pending' || p.status === 'In Progress').length;
  const criticalIssues = issues.filter(i => i.priority === 'Critical' && i.status === 'Open').length;
  const openIssues = issues.filter(i => i.status === 'Open' || i.status === 'In Progress').length;

  const kpis = [
    { label: 'Tasks', value: `${completedTasks}/${tasks.length}`, sub: `${taskPercent}% complete`, icon: ClipboardList, critical: false },
    { label: 'Materials at Risk', value: materialStats.critical + materialStats.short, sub: `${materialStats.critical} critical`, icon: Package, critical: materialStats.critical > 0 },
    { label: 'Open Requests', value: openRequests, sub: `${requests.length} total`, icon: ShoppingCart, critical: false },
    { label: 'Pending Picks', value: pendingPicks, sub: `${picks.length} total`, icon: Truck, critical: false },
    { label: 'Open Issues', value: openIssues, sub: criticalIssues > 0 ? `${criticalIssues} critical` : 'None critical', icon: AlertTriangle, critical: criticalIssues > 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <p className="text-xs text-muted-foreground">{selectedProject.project_name} — {selectedVersion.version_name}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="kpi-card"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {kpi.label}
                    </span>
                    <Icon className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <div className={cn("text-2xl font-bold", kpi.critical ? "text-accent" : "text-foreground")}>
                    {kpi.value}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{kpi.sub}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="kpi-card">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Task Progress by Phase
              </h3>
              <div className="space-y-3">
                {phaseOrder.map(phase => {
                  const phaseTasks = tasks.filter(t => t.phase === phase);
                  if (phaseTasks.length === 0) return null;
                  const avgProgress = Math.round(phaseTasks.reduce((s, t) => s + Number(t.progress), 0) / phaseTasks.length * 100);
                  return (
                    <div key={phase}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-foreground">{phase}</span>
                        <span className="text-muted-foreground font-mono">{avgProgress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tasks yet</p>
                )}
              </div>
            </div>

            <div className="kpi-card">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Recent Issues
              </h3>
              {issues.length === 0 ? (
                <p className="text-xs text-muted-foreground">No open issues</p>
              ) : (
                <div className="space-y-2">
                  {issues.slice(0, 4).map(issue => (
                    <div key={issue.id} className="flex items-start gap-2.5 rounded border border-border p-2.5">
                      <div className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                        issue.priority === 'Critical' ? "bg-accent" : "bg-muted-foreground/40",
                      )} />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">{issue.issue_description.slice(0, 90)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {issue.priority} · {issue.status} · {issue.related_module ?? 'General'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
