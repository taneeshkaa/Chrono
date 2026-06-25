import { prisma } from './prisma'
import { CommitmentStatus } from '@prisma/client'
import { logger } from './logger'

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export function getRiskLevel(score: number): RiskLevel {
  if (score < 25) return 'LOW'
  if (score < 50) return 'MEDIUM'
  if (score < 75) return 'HIGH'
  return 'CRITICAL'
}

export function calculateRiskScore(
  deadline: Date | null,
  status: CommitmentStatus,
  now: Date = new Date()
): { riskScore: number; newStatus: CommitmentStatus } {
  let baseScore = 0
  let newStatus = status
  let isOverdue = false

  // Status overrides
  if (status === CommitmentStatus.COMPLETED) {
    return { riskScore: 0, newStatus }
  }

  if (status === CommitmentStatus.ARCHIVED) {
    return { riskScore: 0, newStatus }
  }

  if (status === CommitmentStatus.MISSED) {
    return { riskScore: 100, newStatus }
  }

  if (deadline) {
    const diffMs = deadline.getTime() - now.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffHours / 24

    if (diffHours < 0) {
      isOverdue = true
    } else if (diffHours < 24) {
      baseScore = 100
    } else if (diffDays < 3) {
      baseScore = 90
    } else if (diffDays < 7) {
      baseScore = 70
    } else if (diffDays < 15) {
      baseScore = 50
    } else if (diffDays < 30) {
      baseScore = 25
    } else {
      baseScore = 10
    }
  } else {
    if (status === CommitmentStatus.DISCOVERED) {
      baseScore = 20
    } else if (status === CommitmentStatus.ACTIVE) {
      baseScore = 40
    }
  }

  if (
    isOverdue &&
    (status === CommitmentStatus.DISCOVERED ||
      status === CommitmentStatus.ACTIVE ||
      status === CommitmentStatus.AT_RISK)
  ) {
    newStatus = CommitmentStatus.MISSED
    baseScore = 100
    logger.warn('OVERDUE DETECTED', { status, newStatus, deadline, now })
    logger.warn('COMMITMENT MARKED MISSED')
  } else {
    if (status === CommitmentStatus.DISCOVERED) {
      baseScore += 10
    } else if (status === CommitmentStatus.ACTIVE) {
      baseScore += 20
    }
  }

  const riskScore = Math.max(0, Math.min(100, baseScore))

  return { riskScore, newStatus }
}

export async function recalculateCommitmentRisk(commitmentId: string) {
  const commitment = await prisma.commitment.findUnique({
    where: { id: commitmentId },
  })

  if (!commitment) {
    return null
  }

  const { riskScore, newStatus } = calculateRiskScore(
    commitment.deadline,
    commitment.status
  )

  const updatedCommitment = await prisma.commitment.update({
    where: { id: commitmentId },
    data: { riskScore, status: newStatus },
  })

  return updatedCommitment
}

export async function recalculateAllRisks() {
  const commitments = await prisma.commitment.findMany()
  const results = []

  for (const commitment of commitments) {
    const { riskScore, newStatus } = calculateRiskScore(
      commitment.deadline,
      commitment.status
    )

    if (
      commitment.riskScore !== riskScore ||
      commitment.status !== newStatus
    ) {
      const updated = await prisma.commitment.update({
        where: { id: commitment.id },
        data: { riskScore, status: newStatus },
      })
      results.push(updated)
    }
  }

  return results
}
