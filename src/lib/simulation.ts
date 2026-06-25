import { prisma } from './prisma'
import { CommitmentStatus } from '@prisma/client'
import { logger } from './logger'
import { getErrorMessage } from './errors'
import { analyzeCommitment } from './consequences'
import { generateFutureOutlook } from './outlook'
import { generateProfile } from './reliability'
import { generateTimeline } from './timeline'
import type {
  ReliabilityProfile,
  SimulationResult,
  CommitmentPrediction,
} from '@/types/simulation'

export interface SimulationCommitmentInput {
  id: string
  userId: string
  title: string
  description: string | null
  category: string
  priority: string
  status: CommitmentStatus
  deadline: Date | null
  riskScore: number
  lastActivity: Date | null
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Weight constants for failure probability calculation
// ---------------------------------------------------------------------------
const WEIGHT_RISK_SCORE = 0.4
const WEIGHT_DEADLINE = 0.3
const WEIGHT_ACTIVITY = 0.15
const WEIGHT_STATUS = 0.15

// Thresholds
const STALE_ACTIVITY_DAYS = 7

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute the deadline proximity factor (0.0 – 1.0).
 *  - Overdue  → 1.0
 *  - < 1 day  → 0.95
 *  - < 3 days → 0.8
 *  - < 7 days → 0.6
 *  - < 15 days→ 0.4
 *  - < 30 days→ 0.2
 *  - > 30 days→ 0.1
 *  - No deadline → 0.3 (unknown = moderate concern)
 */
function computeDeadlineFactor(
  deadline: Date | null,
  now: Date
): { factor: number; riskFactors: string[] } {
  const riskFactors: string[] = []

  if (!deadline) {
    riskFactors.push('No deadline set — harder to track progress')
    return { factor: 0.3, riskFactors }
  }

  const diffMs = deadline.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffHours / 24

  if (diffHours < 0) {
    const overdueDays = Math.abs(Math.floor(diffDays))
    riskFactors.push(`Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`)
    return { factor: 1.0, riskFactors }
  }

  if (diffHours < 24) {
    const hoursLeft = Math.max(1, Math.floor(diffHours))
    riskFactors.push(`Deadline in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`)
    return { factor: 0.95, riskFactors }
  }

  if (diffDays < 3) {
    riskFactors.push(`Deadline in ${Math.floor(diffDays)} day${Math.floor(diffDays) !== 1 ? 's' : ''}`)
    return { factor: 0.8, riskFactors }
  }

  if (diffDays < 7) {
    riskFactors.push(`Deadline in ${Math.floor(diffDays)} days`)
    return { factor: 0.6, riskFactors }
  }

  if (diffDays < 15) {
    riskFactors.push(`Deadline in ${Math.floor(diffDays)} days`)
    return { factor: 0.4, riskFactors }
  }

  if (diffDays < 30) {
    return { factor: 0.2, riskFactors }
  }

  return { factor: 0.1, riskFactors }
}

/**
 * Compute the activity recency factor (0.0 – 1.0).
 *  - No lastActivity at all → 1.0
 *  - > 7 days stale          → 1.0
 *  - Otherwise proportional   → daysSince / 7
 */
function computeActivityFactor(
  lastActivity: Date | null,
  now: Date
): { factor: number; riskFactors: string[] } {
  const riskFactors: string[] = []

  if (!lastActivity) {
    riskFactors.push('No recorded activity')
    return { factor: 1.0, riskFactors }
  }

  const daysSince = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSince >= STALE_ACTIVITY_DAYS) {
    riskFactors.push(`No activity for ${Math.floor(daysSince)} days`)
    return { factor: 1.0, riskFactors }
  }

  // Proportional: 0 days ago → 0.0, 7 days ago → 1.0
  return { factor: daysSince / STALE_ACTIVITY_DAYS, riskFactors }
}

/**
 * Map commitment status to a failure signal (0.0 – 1.0).
 */
function computeStatusFactor(
  status: CommitmentStatus
): { factor: number; riskFactors: string[] } {
  const riskFactors: string[] = []

  switch (status) {
    case CommitmentStatus.AT_RISK:
      riskFactors.push('Status is AT_RISK')
      return { factor: 0.8, riskFactors }
    case CommitmentStatus.DISCOVERED:
      riskFactors.push('Commitment still in DISCOVERED state — not yet actioned')
      return { factor: 0.5, riskFactors }
    case CommitmentStatus.ACTIVE:
      return { factor: 0.2, riskFactors }
    case CommitmentStatus.MISSED:
      riskFactors.push('Already MISSED')
      return { factor: 1.0, riskFactors }
    default:
      return { factor: 0.0, riskFactors }
  }
}

/**
 * Compute the weighted failure probability for a single commitment.
 */
function computeFailureProbability(
  riskScore: number,
  deadline: Date | null,
  lastActivity: Date | null,
  status: CommitmentStatus,
  now: Date
): { failureProbability: number; riskFactors: string[] } {
  // Factor 1: Risk score (already 0-100, normalise to 0-1)
  const riskFactor = riskScore / 100
  const riskFactors: string[] = []

  if (riskScore >= 75) {
    riskFactors.push(`High risk score (${riskScore}/100)`)
  } else if (riskScore >= 50) {
    riskFactors.push(`Moderate risk score (${riskScore}/100)`)
  }

  // Factor 2: Deadline proximity
  const deadline_ = computeDeadlineFactor(deadline, now)
  riskFactors.push(...deadline_.riskFactors)

  // Factor 3: Activity recency
  const activity_ = computeActivityFactor(lastActivity, now)
  riskFactors.push(...activity_.riskFactors)

  // Factor 4: Status signal
  const status_ = computeStatusFactor(status)
  riskFactors.push(...status_.riskFactors)

  // Weighted sum
  const raw =
    WEIGHT_RISK_SCORE * riskFactor +
    WEIGHT_DEADLINE * deadline_.factor +
    WEIGHT_ACTIVITY * activity_.factor +
    WEIGHT_STATUS * status_.factor

  // Clamp to [0, 1]
  const failureProbability = Math.round(Math.min(1, Math.max(0, raw)) * 1000) / 1000

  return { failureProbability, riskFactors }
}

function clampRiskScore(riskScore: number): number {
  return Math.max(0, Math.min(100, riskScore))
}

function calculateReliabilityAdjustedRiskScore(
  riskScore: number,
  category: string,
  reliabilityProfile: ReliabilityProfile
): { riskScore: number; adjustment: number | null } {
  const categoryReliability = reliabilityProfile.categoryScores[category.toLowerCase()]

  if (categoryReliability === undefined) {
    return { riskScore, adjustment: null }
  }

  let adjustment = 0

  if (categoryReliability < 25) {
    adjustment = 30
  } else if (categoryReliability < 40) {
    adjustment = 20
  } else if (categoryReliability >= 90) {
    adjustment = -15
  } else if (categoryReliability >= 75) {
    adjustment = -10
  } else if (categoryReliability >= 60) {
    adjustment = -5
  }

  return {
    riskScore: clampRiskScore(riskScore + adjustment),
    adjustment,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function runSimulationForCommitments(
  userId: string,
  commitments: SimulationCommitmentInput[],
  now: Date = new Date()
): SimulationResult {
  const reliabilityProfile = generateProfile(commitments, now)
  const activeCommitments = commitments.filter(
    (c) => c.status !== CommitmentStatus.COMPLETED && c.status !== CommitmentStatus.ARCHIVED
  )

  // Build per-commitment predictions
  const predictions: CommitmentPrediction[] = activeCommitments.map((c) => {
    const adjustedRisk = calculateReliabilityAdjustedRiskScore(
      c.riskScore,
      c.category,
      reliabilityProfile
    )
    const { failureProbability, riskFactors } = computeFailureProbability(
      adjustedRisk.riskScore,
      c.deadline,
      c.lastActivity,
      c.status,
      now
    )

    if (adjustedRisk.adjustment !== null && adjustedRisk.adjustment !== 0) {
      const direction = adjustedRisk.adjustment > 0 ? '+' : ''
      riskFactors.push(`Reliability adjustment (${direction}${adjustedRisk.adjustment} risk)`)
    }

    const consequenceAnalysis = analyzeCommitment(
      c.category,
      c.priority,
      c.title,
      c.description
    )

    return {
      commitmentId: c.id,
      title: c.title,
      category: c.category,
        priority: c.priority,
        status: c.status,
        deadline: c.deadline?.toISOString() ?? null,
        riskScore: adjustedRisk.riskScore,
        failureProbability,
        riskFactors,
        consequenceAnalysis,
    }
  })

  // Sort by failure probability descending (most likely to fail first)
  predictions.sort((a, b) => b.failureProbability - a.failureProbability)

  // Overall success probability
  const totalActive = activeCommitments.length
  const totalAtRisk = activeCommitments.filter(
    (c) => c.status === CommitmentStatus.AT_RISK || c.status === CommitmentStatus.MISSED
  ).length

  let overallSuccessProbability: number
  if (predictions.length === 0) {
    overallSuccessProbability = 1.0
  } else {
    const avgFailure =
      predictions.reduce((sum, p) => sum + p.failureProbability, 0) / predictions.length
    overallSuccessProbability = Math.round((1 - avgFailure) * 1000) / 1000
  }

  const futureOutlook = {
    ...generateFutureOutlook(predictions, overallSuccessProbability, reliabilityProfile),
    timeline: generateTimeline(predictions, now),
  }

  return {
    userId,
    simulatedAt: now.toISOString(),
    overallSuccessProbability,
    totalActive,
    totalAtRisk,
    predictions,
    futureOutlook,
  }
}

/**
 * Run the Future Simulation Engine for a given user.
 *
 * Fetches all active (non-completed, non-archived) commitments,
 * computes per-commitment failure probabilities using a weighted
 * factor model, and returns an overall success probability.
 */
export async function runSimulation(userId: string): Promise<SimulationResult> {
  try {
    const now = new Date()

    // Fetch all commitments so reliability can use historical completed/missed behavior.
    const commitments = await prisma.commitment.findMany({
      where: {
        userId,
      },
    })

    return runSimulationForCommitments(userId, commitments, now)
  } catch (error) {
    logger.error('SIMULATION ENGINE ERROR', { message: getErrorMessage(error) })
    throw error
  }
}
