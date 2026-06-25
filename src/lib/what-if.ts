import { CommitmentStatus } from '@prisma/client'
import { prisma } from './prisma'
import {
  runSimulationForCommitments,
  type SimulationCommitmentInput,
} from './simulation'
import type {
  FutureOutlook,
  HypotheticalCommitment,
  WhatIfSimulationDelta,
  WhatIfSimulationRequest,
  WhatIfSimulationResult,
} from '@/types/simulation'

const VALID_CATEGORIES = ['ACADEMIC', 'CAREER', 'PERSONAL', 'FINANCE']
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const VALID_STATUSES: CommitmentStatus[] = [
  CommitmentStatus.DISCOVERED,
  CommitmentStatus.ACTIVE,
  CommitmentStatus.AT_RISK,
  CommitmentStatus.MISSED,
]

export class WhatIfSimulationError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400
  ) {
    super(message)
  }
}

function cloneCommitments(
  commitments: SimulationCommitmentInput[]
): SimulationCommitmentInput[] {
  return commitments.map((commitment) => ({
    ...commitment,
    deadline: commitment.deadline ? new Date(commitment.deadline) : null,
    lastActivity: commitment.lastActivity ? new Date(commitment.lastActivity) : null,
    updatedAt: new Date(commitment.updatedAt),
  }))
}

function parseOptionalDate(value: string | null | undefined, fieldName: string): Date | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new WhatIfSimulationError(`${fieldName} must be a valid date string`)
  }

  return date
}

function parseRiskScore(value: number | undefined): number {
  if (value === undefined) return 0

  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new WhatIfSimulationError('hypotheticalCommitment.riskScore must be an integer from 0 to 100')
  }

  return value
}

function validateHypotheticalCommitment(
  hypotheticalCommitment: HypotheticalCommitment | undefined
): HypotheticalCommitment {
  if (!hypotheticalCommitment) {
    throw new WhatIfSimulationError('hypotheticalCommitment is required for ADD simulations')
  }

  if (!hypotheticalCommitment.title?.trim()) {
    throw new WhatIfSimulationError('hypotheticalCommitment.title is required')
  }

  if (
    hypotheticalCommitment.description !== undefined &&
    hypotheticalCommitment.description !== null &&
    typeof hypotheticalCommitment.description !== 'string'
  ) {
    throw new WhatIfSimulationError('hypotheticalCommitment.description must be a string')
  }

  if (!VALID_CATEGORIES.includes(hypotheticalCommitment.category)) {
    throw new WhatIfSimulationError('hypotheticalCommitment.category is invalid')
  }

  if (!VALID_PRIORITIES.includes(hypotheticalCommitment.priority)) {
    throw new WhatIfSimulationError('hypotheticalCommitment.priority is invalid')
  }

  if (
    hypotheticalCommitment.status &&
    (typeof hypotheticalCommitment.status !== 'string' ||
      !VALID_STATUSES.includes(hypotheticalCommitment.status as CommitmentStatus))
  ) {
    throw new WhatIfSimulationError('hypotheticalCommitment.status is invalid')
  }

  if (
    hypotheticalCommitment.deadline !== undefined &&
    hypotheticalCommitment.deadline !== null &&
    typeof hypotheticalCommitment.deadline !== 'string'
  ) {
    throw new WhatIfSimulationError('hypotheticalCommitment.deadline must be a date string')
  }

  if (
    hypotheticalCommitment.lastActivity !== undefined &&
    hypotheticalCommitment.lastActivity !== null &&
    typeof hypotheticalCommitment.lastActivity !== 'string'
  ) {
    throw new WhatIfSimulationError('hypotheticalCommitment.lastActivity must be a date string')
  }

  if (
    hypotheticalCommitment.riskScore !== undefined &&
    typeof hypotheticalCommitment.riskScore !== 'number'
  ) {
    throw new WhatIfSimulationError('hypotheticalCommitment.riskScore must be a number')
  }

  return hypotheticalCommitment
}

function requireCommitmentId(commitmentId: string | undefined): string {
  if (!commitmentId) {
    throw new WhatIfSimulationError('commitmentId is required for this simulation action')
  }

  return commitmentId
}

function generateDelta(
  currentOutlook: FutureOutlook,
  simulatedOutlook: FutureOutlook
): WhatIfSimulationDelta {
  const addedAlerts = simulatedOutlook.futureAlerts.filter(
    (alert) => !currentOutlook.futureAlerts.includes(alert)
  )
  const removedAlerts = currentOutlook.futureAlerts.filter(
    (alert) => !simulatedOutlook.futureAlerts.includes(alert)
  )

  return {
    successProbabilityDifference:
      Math.round((simulatedOutlook.successProbability - currentOutlook.successProbability) * 1000) /
      1000,
    futureHealthChanged: currentOutlook.futureHealth !== simulatedOutlook.futureHealth,
    criticalCommitmentsDifference:
      simulatedOutlook.criticalCommitments.count - currentOutlook.criticalCommitments.count,
    alertsDifference: {
      added: addedAlerts,
      removed: removedAlerts,
    },
  }
}

export function simulateCompletion(
  commitments: SimulationCommitmentInput[],
  commitmentId: string
): SimulationCommitmentInput[] {
  const cloned = cloneCommitments(commitments)
  const target = cloned.find((commitment) => commitment.id === commitmentId)

  if (!target) {
    throw new WhatIfSimulationError('Commitment not found', 404)
  }

  target.status = CommitmentStatus.COMPLETED
  return cloned
}

export function simulateIgnore(
  commitments: SimulationCommitmentInput[],
  commitmentId: string
): SimulationCommitmentInput[] {
  const cloned = cloneCommitments(commitments)
  const target = cloned.find((commitment) => commitment.id === commitmentId)

  if (!target) {
    throw new WhatIfSimulationError('Commitment not found', 404)
  }

  target.status = CommitmentStatus.MISSED
  return cloned
}

export function simulateAdd(
  userId: string,
  commitments: SimulationCommitmentInput[],
  hypotheticalCommitment: HypotheticalCommitment
): SimulationCommitmentInput[] {
  const cloned = cloneCommitments(commitments)

  cloned.push({
    id: `what-if-${cloned.length + 1}`,
    userId,
    title: hypotheticalCommitment.title.trim(),
    description: hypotheticalCommitment.description ?? null,
    category: hypotheticalCommitment.category,
    priority: hypotheticalCommitment.priority,
    status: (hypotheticalCommitment.status as CommitmentStatus | undefined) ?? CommitmentStatus.DISCOVERED,
    deadline: parseOptionalDate(hypotheticalCommitment.deadline, 'hypotheticalCommitment.deadline'),
    riskScore: parseRiskScore(hypotheticalCommitment.riskScore),
    lastActivity: parseOptionalDate(
      hypotheticalCommitment.lastActivity,
      'hypotheticalCommitment.lastActivity'
    ),
    updatedAt: new Date(),
  })

  return cloned
}

export async function runSimulation(
  userId: string,
  request: WhatIfSimulationRequest
): Promise<WhatIfSimulationResult> {
  const now = new Date()
  const commitments = await prisma.commitment.findMany({
    where: {
      userId,
    },
  })

  const currentOutlook = runSimulationForCommitments(userId, commitments, now).futureOutlook

  let simulatedCommitments: SimulationCommitmentInput[]
  switch (request.action) {
    case 'COMPLETE':
      simulatedCommitments = simulateCompletion(commitments, requireCommitmentId(request.commitmentId))
      break
    case 'IGNORE':
      simulatedCommitments = simulateIgnore(commitments, requireCommitmentId(request.commitmentId))
      break
    case 'ADD':
      simulatedCommitments = simulateAdd(
        userId,
        commitments,
        validateHypotheticalCommitment(request.hypotheticalCommitment)
      )
      break
    default:
      throw new WhatIfSimulationError('Unsupported simulation action')
  }

  const simulatedOutlook = runSimulationForCommitments(userId, simulatedCommitments, now).futureOutlook

  return {
    currentOutlook,
    simulatedOutlook,
    delta: generateDelta(currentOutlook, simulatedOutlook),
  }
}

export const WhatIfSimulationService = {
  simulateCompletion,
  simulateIgnore,
  simulateAdd,
  runSimulation,
}
