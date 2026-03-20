import { useProject } from '@/contexts/ProjectContext';
import {
  useBomLines, useSuppliers, useInventory, useTasks, usePartRequests,
  usePickingOrders, useIssues, useWorkOrders, useGateReviews,
  useShortageAlerts, useECNs,
} from '@/hooks/use-supabase-data';
import { motion } from 'framer-motion';
import {
  Package, ClipboardList, ShoppingCart, Truck, AlertTriangle,
  Loader2, Wrench, ShieldCheck, AlertOctagon, FileWarning,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const phaseOrder = ['MP', 'EVT', 'DVT', 'PPVT', 'Production'] as const;

// ── Circular progress ring for gate readiness ────────────────────────────────

const MiniRing = ({ percent, size = 48 }: { percent: number; size?: number }) => {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted-foreground/20" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="text-blue-500 transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-blue-500 text-[10px] font-bold rotate-90 origin-center">{percent}%</text>
    </svg>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const { selectedProject, selectedVersion } = useProject();
  const navigate = useNavigate();

  const versionId = selectedVersion?.id;
  const { data: allLines = [], isLoading: linesLoading } = useBomLines(versionId);
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory(versionId);
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(versionId);
  const { data: requests = [], isLoading: requestsLoading } = usePartRequests(versionId);
  const { data: picks = [], isLoading: picksLoading } = usePickingOrders(versionId);
  const { data: issues = [], isLoading: issuesLoading } = useIssues(versionId);
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrders(versionId);

  // New data sources for summary cards
  const { data: gateReviews = [] } = useGateReviews(versionId);
  const { data: shortageAlerts = [] } = useShortageAlerts(versionId);
  const { data: ecns = [] } = useECNs(versionId);

  const isLoading = linesLoading || suppliersLoading || inventoryLoading || tasksLoading || requestsLoading || picksLoading || issuesLoading || woLoading;

  // ── Derived data ──────────────────────────────────────────────────────────

  const inventoryByPart = useMemo(() => {
    const map = new Map<string, typeof inventory[0]>();
    inventory.forEach(i => map.set(i.part_number, i));
    return map;
  }, [inventory]);

  const materialStats = useMemo(() => {
    const seen = new Set<string>();
    const parts = allLines.filter(l => {
      if (l.bom_level === 0 || seen.has(l.component_number)) return false;
      seen.add(l.component_number);
      return true;
    });
    let critical = 0;
    let short = 0;
    parts.forEach(l => {
      const inv = inventoryByPart.get(l.component_number);
      const onHand = inv?.on_hand_qty ?? 0;
      const onOrder = inv?.on_order_qty ?? 0;
      const variance = Number(l.required_qty) - onHand - onOrder;
      if (variance > 0 && onHand === 0) critical++;
      else if (variance > 0) short++;
    });
    return { critical, short };
  }, [allLines, inventoryByPart]);

  // Gate readiness derived
  const currentGate = gateReviews[0];
  const gatePhase = currentGate?.gate_name ?? selectedVersion?.version_name ?? '—';
  const gatePercent = currentGate?.readiness_score ?? 0;
  const gateStatus = currentGate?.status ?? 'planned';

  // Shortage derived
  const topShortage = shortageAlerts.length > 0 ? shortageAlerts[0] : null;

  // ECN derived
  const openEcns = useMemo(() =>
    ecns.filter(e => e.status === 'draft' || e.status === 'under_review'),
  [ecns]);
  const lastEcnDate = useMemo(() => {
    if (ecns.length === 0) return null;
    const sorted = [...ecns].sort((a, b) =>
      new Date(b.submitted_at ?? b.created_at).getTime() - new Date(a.submitted_at ?? a.created_at).getTime()
    );
    return sorted[0].submitted_at ?? sorted[0].created_at;
  }, [ecns]);

  if (!selectedProject || !selectedVersion) return null;

  const completedTasks = tasks.filter(t => t.status === 'Complete').length;
  const taskPercent = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const openRequests = requests.filter(r => r.status === 'Pending').length;
  const pendingPicks = picks.filter(p => p.status === 'Pending' || p.status === 'In Progress').length;
  const criticalIssues = issues.filter(i => i.priority === 'Critical' && i.status === 'Open').length;
  const openIssues = issues.filter(i => i.status === 'Open' || i.status === 'In Progress').length;
  const openWOs = workOrders.filter(w => w.status === 'Open' || w.status === 'In Progress').length;
  const inProgressWOs = workOrders.filter(w => w.status === 'In Progress').length;

  const kpis = [
    { label: 'Tasks', value: `${completedTasks}/${tasks.length}`, sub: `${taskPercent}% complete`, icon: ClipboardList, critical: false },
    { label: 'Materials at Risk', value: materialStats.critical + materialStats.short, sub: `${materialStats.critical} critical`, icon: Package, critical: materialStats.critical > 0 },
    { label: 'Open Requests', value: openRequests, sub: `${requests.length} total`, icon: ShoppingCart, critical: false },
    { label: 'Pending Picks', value: pendingPicks, sub: `${picks.length} total`, icon: Truck, critical: false },
    { label: 'Open Issues', value: openIssues, sub: criticalIssues > 0 ? `${criticalIssues} critical` : 'None critical', icon: AlertTriangle, critical: criticalIssues > 0 },
    { label: 'Work Orders', value: openWOs, sub: inProgressWOs > 0 ? `${inProgressWOs} in progress` : `${workOrders.length} total`, icon: Wrench, critical: false },
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
          {/* ── Top Summary Cards (Gate / Shortages / ECNs) ──────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Gate Readiness */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="kpi-card"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Gate Readiness
                </span>
                <ShieldCheck className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="flex items-center gap-4">
                <MiniRing percent={gatePercent} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{gatePhase}</p>
                  <span className={cn(
                    'inline-block mt-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    gateStatus === 'completed' && 'text-ops-green bg-ops-green/15',
                    gateStatus === 'in_progress' && 'text-blue-500 bg-blue-500/15',
                    gateStatus === 'planned' && 'text-muted-foreground bg-muted',
                  )}>
                    {gateStatus === 'in_progress' ? 'In Progress' : gateStatus === 'completed' ? 'Complete' : 'Planned'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate('/gate-readiness')}
                className="mt-3 flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View gate review <ArrowRight className="h-3 w-3" />
              </button>
            </motion.div>

            {/* Shortage Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="kpi-card"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Shortage Alerts
                </span>
                <AlertOctagon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-2xl font-bold',
                  shortageAlerts.length > 0 ? 'text-accent' : 'text-ops-green',
                )}>
                  {shortageAlerts.length}
                </span>
                {shortageAlerts.length > 0 && (
                  <span className="rounded bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent animate-pulse">
                    {shortageAlerts.length} at risk
                  </span>
                )}
              </div>
              {topShortage ? (
                <p className="mt-2 text-[11px] text-muted-foreground truncate">
                  Most critical: <span className="font-mono font-medium text-foreground">{topShortage.part_number}</span>
                  {' '}— {topShortage.shortfall} short
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-ops-green">All parts adequately stocked</p>
              )}
              <button
                onClick={() => navigate('/shortages')}
                className="mt-3 flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View shortages <ArrowRight className="h-3 w-3" />
              </button>
            </motion.div>

            {/* ECN Activity */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="kpi-card"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  ECN Activity
                </span>
                <FileWarning className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'text-2xl font-bold',
                  openEcns.length > 0 ? 'text-ops-amber' : 'text-foreground',
                )}>
                  {openEcns.length}
                </span>
                <span className="text-[11px] text-muted-foreground">open ECN{openEcns.length !== 1 ? 's' : ''}</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {lastEcnDate
                  ? <>Last submitted: <span className="font-medium text-foreground">{new Date(lastEcnDate).toLocaleDateString()}</span></>
                  : 'No ECNs submitted'}
              </p>
              <button
                onClick={() => navigate('/ecns')}
                className="mt-3 flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                View ECN tracker <ArrowRight className="h-3 w-3" />
              </button>
            </motion.div>
          </div>

          {/* ── Existing KPI Grid ─────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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

          {/* ── Detail Cards ──────────────────────────────────────────────── */}
          <div className="grid gap-3 lg:grid-cols-3">
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

            <div className="kpi-card">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Work Orders
              </h3>
              {workOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No work orders yet</p>
              ) : (
                <div className="space-y-2">
                  {workOrders.slice(0, 4).map(wo => (
                    <div key={wo.id} className="flex items-start gap-2.5 rounded border border-border p-2.5">
                      <div className={cn(
                        "mt-1 h-1.5 w-1.5 rounded-full shrink-0",
                        wo.status === 'In Progress' ? "bg-accent" :
                        wo.status === 'Completed' ? "bg-green-500" : "bg-muted-foreground/40",
                      )} />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">WO# {wo.work_order_number}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {wo.status} · {wo.mode === 'from_bom' ? 'From BOM' : 'Custom'}
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
