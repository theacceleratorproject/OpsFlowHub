import { useProject } from '@/contexts/ProjectContext';
import { useGateReviews, useGateReadinessSummary, useUpdateGateCriterion } from '@/hooks/use-supabase-data';
import type { GateReviewWithCriteria, GateCriterionRow } from '@/hooks/use-supabase-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ShieldCheck, Check, AlertTriangle, FileText, Package, ClipboardList, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const GATE_ORDER = ['Proto', 'EVT', 'DVT', 'PVT', 'MP'] as const;

// ── SVG progress ring for the active phase pill ────────────────────────────

const ProgressRing = ({ percent, size = 32 }: { percent: number; size?: number }) => {
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted-foreground/20" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="text-blue-500 transition-all duration-700" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="fill-blue-500 text-[8px] font-bold rotate-90 origin-center">{percent}%</text>
    </svg>
  );
};

// ── Main component ─────────────────────────────────────────────────────────

const GateReadiness = () => {
  const { selectedProject, selectedVersion } = useProject();
  const projectId = selectedProject?.id;
  const versionId = selectedVersion?.id;

  // Current version's review with criteria joined
  const { data: reviewsForVersion = [], isLoading: reviewLoading } = useGateReviews(versionId);
  const currentReview: GateReviewWithCriteria | undefined = reviewsForVersion[0];
  const criteria: GateCriterionRow[] = currentReview?.gate_criteria ?? [];

  // Summary metrics computed server-side
  const { data: summary, isLoading: summaryLoading } = useGateReadinessSummary(versionId);

  // All reviews across the project (for the phase timeline)
  const { data: timelineReviews = [], isLoading: timelineLoading } = useQuery({
    queryKey: ['gate_reviews_timeline', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gate_reviews')
        .select('gate_name, status, readiness_score, project_version_id, project_versions!inner(project_id)')
        .eq('project_versions.project_id', projectId!);
      if (error) throw error;
      return data as unknown as { gate_name: string; status: string; readiness_score: number | null }[];
    },
  });

  const updateCriterion = useUpdateGateCriterion();

  const isLoading = reviewLoading || summaryLoading || timelineLoading;

  // Map gate_name → review for timeline
  const reviewMap = useMemo(() => {
    const m = new Map<string, (typeof timelineReviews)[0]>();
    timelineReviews.forEach(r => m.set(r.gate_name, r));
    return m;
  }, [timelineReviews]);

  // Group criteria by category
  const criteriaByCategory = useMemo(() => {
    const groups: Record<string, GateCriterionRow[]> = {};
    criteria.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [criteria]);

  // Days until / since target
  const daysInfo = useMemo(() => {
    if (!currentReview?.target_date) return null;
    const target = new Date(currentReview.target_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [currentReview]);

  const statusLabel = useMemo(() => {
    if (daysInfo === null) return { text: '—', color: 'text-muted-foreground' };
    const score = currentReview?.readiness_score ?? 0;
    if (daysInfo < 0) return { text: 'Overdue', color: 'text-accent' };
    if (score < 50 || (daysInfo <= 7 && score < 80)) return { text: 'At Risk', color: 'text-ops-amber' };
    return { text: 'On Track', color: 'text-ops-green' };
  }, [daysInfo, currentReview]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleToggle = async (id: string, currentVal: boolean) => {
    try {
      await updateCriterion.mutateAsync({ id, is_met: !currentVal });
      toast.success(!currentVal ? 'Criterion met' : 'Criterion reopened');
    } catch {
      toast.error('Failed to update criterion');
    }
  };

  if (!selectedProject || !selectedVersion) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const readiness = currentReview?.readiness_score ?? 0;
  const metCount = criteria.filter(c => c.is_met).length;

  // ── Summary metric cards (from hook data) ────────────────────────

  const metrics = [
    { label: 'Critical Issues', value: summary?.criticalIssues ?? 0, sub: `${summary?.totalOpenIssues ?? 0} total open`, icon: AlertTriangle, critical: (summary?.criticalIssues ?? 0) > 0 },
    { label: 'BOM Lines Locked', value: summary?.bomLinesLocked ?? 0, sub: 'Components tracked', icon: FileText, critical: false },
    { label: 'Parts Available', value: `${summary?.partsAvailable ?? 0}/${summary?.totalParts ?? 0}`, sub: `${(summary?.totalParts ?? 0) - (summary?.partsAvailable ?? 0)} at risk`, icon: Package, critical: (summary?.totalParts ?? 0) - (summary?.partsAvailable ?? 0) > 0 },
    { label: 'Pending Sign-offs', value: summary?.pendingSignoffs ?? 0, sub: `${summary?.totalCriteria ?? 0} total criteria`, icon: ClipboardList, critical: (summary?.pendingSignoffs ?? 0) > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Gate Readiness
        </h2>
        <p className="text-xs text-muted-foreground">{selectedProject.project_name} — {selectedVersion.version_name}</p>
      </div>

      {/* Phase Timeline */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="kpi-card">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Phase Timeline</h3>
        <div className="flex items-center justify-center gap-0 overflow-x-auto py-2">
          {GATE_ORDER.map((gate, i) => {
            const review = reviewMap.get(gate);
            const status = review?.status ?? 'none';
            const isCompleted = status === 'completed';
            const isCurrent = status === 'in_progress';
            const score = review?.readiness_score ?? 0;

            return (
              <div key={gate} className="flex items-center">
                {i > 0 && (
                  <div className={cn(
                    "h-0.5 w-8 sm:w-12 md:w-16",
                    isCompleted || (isCurrent && i > 0 && reviewMap.get(GATE_ORDER[i - 1])?.status === 'completed')
                      ? "bg-ops-green/50"
                      : "bg-muted-foreground/20",
                  )} />
                )}
                <div className="flex flex-col items-center gap-1.5">
                  {isCompleted ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ops-green/15 ring-2 ring-ops-green/40">
                      <Check className="h-4 w-4 text-ops-green" />
                    </div>
                  ) : isCurrent ? (
                    <ProgressRing percent={score} />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted ring-2 ring-muted-foreground/20">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    </div>
                  )}
                  <span className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    isCompleted && "text-ops-green",
                    isCurrent && "text-blue-500",
                    !isCompleted && !isCurrent && "text-muted-foreground/50",
                  )}>
                    {gate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Score Card + Criteria Checklist */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Readiness Score Card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="kpi-card flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {currentReview?.gate_name ?? '—'} Readiness
          </span>
          <div className="relative mb-3">
            <svg width={96} height={96} className="-rotate-90">
              <circle cx={48} cy={48} r={40} fill="none" stroke="currentColor" strokeWidth={6} className="text-muted-foreground/10" />
              <circle cx={48} cy={48} r={40} fill="none" stroke="currentColor" strokeWidth={6} strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 - (readiness / 100) * 2 * Math.PI * 40} strokeLinecap="round" className={cn(
                "transition-all duration-700",
                readiness >= 80 ? "text-ops-green" : readiness >= 50 ? "text-blue-500" : "text-ops-amber",
              )} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn("text-3xl font-bold",
                readiness >= 80 ? "text-ops-green" : readiness >= 50 ? "text-foreground" : "text-ops-amber",
              )}>{readiness}%</span>
            </div>
          </div>
          {daysInfo !== null && (
            <p className="text-xs text-muted-foreground">
              {daysInfo > 0 ? `${daysInfo} days until target` : daysInfo === 0 ? 'Target date is today' : `${Math.abs(daysInfo)} days overdue`}
            </p>
          )}
          {currentReview?.target_date && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Target: {new Date(currentReview.target_date).toLocaleDateString()}
            </p>
          )}
          <span className={cn(
            "mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            statusLabel.color,
            statusLabel.text === 'On Track' && "bg-ops-green/10",
            statusLabel.text === 'At Risk' && "bg-ops-amber/10",
            statusLabel.text === 'Overdue' && "bg-accent/10",
          )}>
            {statusLabel.text}
          </span>
        </motion.div>

        {/* Criteria Checklist */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="kpi-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gate Criteria
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">
              {metCount}/{criteria.length} met
            </span>
          </div>

          {Object.keys(criteriaByCategory).length === 0 ? (
            <p className="text-xs text-muted-foreground">No criteria defined for this gate</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(criteriaByCategory).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                    {category}
                  </h4>
                  <div className="space-y-1.5">
                    {items.map(item => (
                      <div key={item.id} className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted/30">
                        <Checkbox
                          checked={item.is_met}
                          onCheckedChange={() => handleToggle(item.id, item.is_met)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs", item.is_met ? "text-muted-foreground line-through" : "text-foreground")}>{item.criterion}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.owner ?? '—'}</p>
                        </div>
                        <span className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                          item.is_met ? "bg-ops-green/10 text-ops-green" : "bg-ops-amber/10 text-ops-amber",
                        )}>
                          {item.is_met ? 'Met' : 'Open'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Summary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 + i * 0.03 }}
              className="kpi-card"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className={cn("text-2xl font-bold", m.critical ? "text-accent" : "text-foreground")}>{m.value}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">{m.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Notes */}
      {currentReview?.notes && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="kpi-card">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gate Notes</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{currentReview.notes}</p>
        </motion.div>
      )}
    </div>
  );
};

export default GateReadiness;
