import { CommitmentStatus } from '@prisma/client'
import type { ReliabilityProfile, ReliabilityTrend } from '@/types/simulation'
import type { SimulationCommitmentInput } from './simulation'

const NEUTRAL_RELIABILITY_SCORE = 50
const RECENT_PERIOD_DAYS = 30
const PREVIOUS_PERIOD_DAYS = 60
const TREND_THRESHOLD_POINTS = 5

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function isHistoricalCommitment(commitment: SimulationCommitmentInput): boolean {
  return (
    commitment.status === CommitmentStatus.COMPLETED ||
    commitment.status === CommitmentStatus.MISSED ||
    commitment.status === CommitmentStatus.ARCHIVED
  )
}

function calculateCompletionRate(commitments: SimulationCommitmentInput[]): number {
  const completed = commitments.filter(
    (commitment) => commitment.status === CommitmentStatus.COMPLETED
  ).length
  const missed = commitments.filter(
    (commitment) => commitment.status === CommitmentStatus.MISSED
  ).length
  const total = completed + missed

  if (total === 0) {
    return NEUTRAL_RELIABILITY_SCORE
  }

  return clampScore((completed / total) * 100)
}

export function calculateOverallReliability(
  commitments: SimulationCommitmentInput[]
): number {
  const historicalCommitments = commitments.filter(isHistoricalCommitment)
  return calculateCompletionRate(historicalCommitments)
}

export function calculateCategoryReliability(
  commitments: SimulationCommitmentInput[]
): Record<string, number> {
  const byCategory = commitments.filter(isHistoricalCommitment).reduce<
    Record<string, SimulationCommitmentInput[]>
  >((acc, commitment) => {
    const category = commitment.category.toLowerCase()
    acc[category] = acc[category] ?? []
    acc[category].push(commitment)
    return acc
  }, {})

  return Object.fromEntries(
    Object.entries(byCategory).map(([category, categoryCommitments]) => [
      category,
      calculateCompletionRate(categoryCommitments),
    ])
  )
}

export function calculateTrend(
  commitments: SimulationCommitmentInput[],
  now: Date = new Date()
): ReliabilityTrend {
  const recentStart = new Date(now.getTime() - RECENT_PERIOD_DAYS * 24 * 60 * 60 * 1000)
  const previousStart = new Date(now.getTime() - PREVIOUS_PERIOD_DAYS * 24 * 60 * 60 * 1000)

  const historicalCommitments = commitments.filter(isHistoricalCommitment)
  const recentCommitments = historicalCommitments.filter(
    (commitment) => commitment.updatedAt >= recentStart && commitment.updatedAt <= now
  )
  const previousCommitments = historicalCommitments.filter(
    (commitment) =>
      commitment.updatedAt >= previousStart && commitment.updatedAt < recentStart
  )

  const recentScore = calculateCompletionRate(recentCommitments)
  const previousScore = calculateCompletionRate(previousCommitments)

  if (recentScore > previousScore + TREND_THRESHOLD_POINTS) {
    return 'IMPROVING'
  }

  if (recentScore < previousScore - TREND_THRESHOLD_POINTS) {
    return 'DECLINING'
  }

  return 'STABLE'
}

export function generateProfile(
  commitments: SimulationCommitmentInput[],
  now: Date = new Date()
): ReliabilityProfile {
  const overallScore = calculateOverallReliability(commitments)
  const categoryScores = calculateCategoryReliability(commitments)
  const sortedCategoryScores = Object.entries(categoryScores).sort(
    ([categoryA, scoreA], [categoryB, scoreB]) =>
      scoreB - scoreA || categoryA.localeCompare(categoryB)
  )

  return {
    overallScore,
    trend: calculateTrend(commitments, now),
    strongestCategory: sortedCategoryScores[0]?.[0] ?? null,
    weakestCategory:
      sortedCategoryScores.length > 0
        ? sortedCategoryScores[sortedCategoryScores.length - 1][0]
        : null,
    categoryScores,
  }
}

export const ReliabilityService = {
  calculateOverallReliability,
  calculateCategoryReliability,
  calculateTrend,
  generateProfile,
}
