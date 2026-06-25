import type {
  CommitmentPrediction,
  FutureHealthStatus,
  FutureOutlook,
  ReliabilityProfile,
} from '@/types/simulation'

const DEFAULT_RELIABILITY_PROFILE: ReliabilityProfile = {
  overallScore: 50,
  trend: 'STABLE',
  strongestCategory: null,
  weakestCategory: null,
  categoryScores: {},
}

// ---------------------------------------------------------------------------
// Future Health thresholds
// ---------------------------------------------------------------------------

/**
 * Map overall success probability (0.0 – 1.0) to a health status.
 *
 *  80–100% → HEALTHY
 *  60–79%  → WATCHLIST
 *  40–59%  → AT_RISK
 *   0–39%  → CRITICAL
 */
export function calculateFutureHealth(
  successProbability: number
): FutureHealthStatus {
  const pct = successProbability * 100

  if (pct >= 80) return 'HEALTHY'
  if (pct >= 60) return 'WATCHLIST'
  if (pct >= 40) return 'AT_RISK'
  return 'CRITICAL'
}

// ---------------------------------------------------------------------------
// Future Alerts — rule-based alert generation
// ---------------------------------------------------------------------------

/**
 * Generate human-readable alerts based on prediction data.
 * Each rule is evaluated independently; all matching alerts are returned.
 */
export function generateFutureAlerts(
  predictions: CommitmentPrediction[],
  successProbability: number
): string[] {
  const alerts: string[] = []

  if (predictions.length === 0) {
    alerts.push('No active commitments. Future outlook is clear.')
    return alerts
  }

  // Rule 1: Any prediction with failureProbability > 0.8
  for (const p of predictions) {
    if (p.failureProbability > 0.8) {
      alerts.push(`"${p.title}" is likely to fail soon.`)
    }
  }

  // Rule 2: Multiple HIGH/CRITICAL impact commitments
  const highImpactCount = predictions.filter(
    (p) =>
      p.consequenceAnalysis.impactLevel === 'HIGH' ||
      p.consequenceAnalysis.impactLevel === 'CRITICAL'
  ).length

  if (highImpactCount >= 2) {
    alerts.push('Multiple high impact commitments require attention.')
  }

  // Rule 3: Overall success probability below 50%
  if (successProbability < 0.5) {
    alerts.push('Future outlook is deteriorating.')
  }

  return alerts
}

// ---------------------------------------------------------------------------
// Recommended Action — single highest-priority recommendation
// ---------------------------------------------------------------------------

/**
 * Return exactly one recommended action.
 * Rules are evaluated in priority order; the first match wins.
 */
export function generateRecommendedAction(
  predictions: CommitmentPrediction[],
  successProbability: number
): string {
  // Priority 1: Success probability below 50%
  if (successProbability < 0.5) {
    return 'Reduce workload and focus on deadlines.'
  }

  // Priority 2: Multiple HIGH/CRITICAL impact commitments
  const highImpactCount = predictions.filter(
    (p) =>
      p.consequenceAnalysis.impactLevel === 'HIGH' ||
      p.consequenceAnalysis.impactLevel === 'CRITICAL'
  ).length

  if (highImpactCount >= 2) {
    return 'Prioritize critical commitments.'
  }

  // Priority 3: Highest-risk commitment exists
  if (predictions.length > 0) {
    const top = predictions[0] // already sorted by failureProbability DESC
    return `Complete "${top.title}" immediately.`
  }

  // Priority 4: No active commitments
  return 'No action needed. All commitments are on track.'
}

// ---------------------------------------------------------------------------
// Public API — FutureOutlookService
// ---------------------------------------------------------------------------

/**
 * Generate a complete FutureOutlook from existing simulation predictions.
 *
 * This is a pure aggregation layer — it reads predictions and
 * successProbability without modifying any prediction or consequence logic.
 */
export function generateFutureOutlook(
  predictions: CommitmentPrediction[],
  successProbability: number,
  reliabilityProfile: ReliabilityProfile = DEFAULT_RELIABILITY_PROFILE
): FutureOutlook {
  const futureHealth = calculateFutureHealth(successProbability)

  // Most at risk commitment — first in array (sorted by failureProbability DESC)
  const mostAtRiskCommitment =
    predictions.length > 0
      ? {
          id: predictions[0].commitmentId,
          title: predictions[0].title,
          failureProbability: predictions[0].failureProbability,
        }
      : null

  // Critical commitments — those with HIGH or CRITICAL impact level
  const criticalList = predictions
    .filter(
      (p) =>
        p.consequenceAnalysis.impactLevel === 'HIGH' ||
        p.consequenceAnalysis.impactLevel === 'CRITICAL'
    )
    .map((p) => ({
      id: p.commitmentId,
      title: p.title,
      impactLevel: p.consequenceAnalysis.impactLevel,
    }))

  const criticalCommitments = {
    count: criticalList.length,
    list: criticalList,
  }

  const futureAlerts = generateFutureAlerts(predictions, successProbability)
  const recommendedAction = generateRecommendedAction(predictions, successProbability)

  return {
    successProbability,
    futureHealth,
    mostAtRiskCommitment,
    criticalCommitments,
    futureAlerts,
    recommendedAction,
    generatedAt: new Date().toISOString(),
    timeline: [],
    reliabilityProfile,
  }
}
