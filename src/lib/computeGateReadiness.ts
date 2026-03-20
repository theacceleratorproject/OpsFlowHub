/**
 * Pure computation: given a list of gate criteria, compute the readiness
 * percentage (0–100, rounded).
 *
 * Extracted from GateReadiness.tsx so the logic can be unit-tested and reused.
 */

export interface GateCriterion {
  id: string;
  is_met: boolean;
}

/**
 * Returns the readiness percentage: `Math.round(met / total * 100)`.
 * Returns 0 when there are no criteria.
 */
export function computeGateReadiness(criteria: GateCriterion[]): number {
  if (criteria.length === 0) return 0;
  const met = criteria.filter(c => c.is_met).length;
  return Math.round((met / criteria.length) * 100);
}
