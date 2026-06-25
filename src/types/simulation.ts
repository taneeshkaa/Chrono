export type CommitmentImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ConsequenceAnalysis {
  impactLevel: CommitmentImpactLevel
  consequences: string[]
  stakeholderImpact: string
  explanation: string
}

export interface CommitmentPrediction {
  commitmentId: string
  title: string
  category: string
  priority: string
  status: string
  deadline: string | null
  riskScore: number
  failureProbability: number
  riskFactors: string[]
  consequenceAnalysis: ConsequenceAnalysis
}

export type FutureTimelineEventType = 'WARNING' | 'DEADLINE' | 'PREDICTION' | 'CONSEQUENCE'

export interface FutureTimelineEvent {
  date: string
  type: FutureTimelineEventType
  title: string
  description: string
  severity: CommitmentImpactLevel
}

export type ReliabilityTrend = 'IMPROVING' | 'DECLINING' | 'STABLE'

export interface ReliabilityProfile {
  overallScore: number
  trend: ReliabilityTrend
  strongestCategory: string | null
  weakestCategory: string | null
  categoryScores: Record<string, number>
}

export type FutureHealthStatus = 'HEALTHY' | 'WATCHLIST' | 'AT_RISK' | 'CRITICAL'

export interface FutureOutlook {
  successProbability: number
  futureHealth: FutureHealthStatus
  mostAtRiskCommitment: {
    id: string
    title: string
    failureProbability: number
  } | null
  criticalCommitments: {
    count: number
    list: { id: string; title: string; impactLevel: CommitmentImpactLevel }[]
  }
  futureAlerts: string[]
  recommendedAction: string
  generatedAt: string
  timeline: FutureTimelineEvent[]
  reliabilityProfile: ReliabilityProfile
}

export interface SimulationResult {
  userId: string
  simulatedAt: string
  overallSuccessProbability: number
  totalActive: number
  totalAtRisk: number
  predictions: CommitmentPrediction[]
  futureOutlook: FutureOutlook
}

export type SimulationAction = 'COMPLETE' | 'IGNORE' | 'ADD'

export interface HypotheticalCommitment {
  title: string
  description?: string | null
  category: string
  priority: string
  status?: string
  deadline?: string | null
  riskScore?: number
  lastActivity?: string | null
}

export interface WhatIfSimulationRequest {
  action: SimulationAction
  commitmentId?: string
  hypotheticalCommitment?: HypotheticalCommitment
}

export interface WhatIfSimulationDelta {
  successProbabilityDifference: number
  futureHealthChanged: boolean
  criticalCommitmentsDifference: number
  alertsDifference: {
    added: string[]
    removed: string[]
  }
}

export interface WhatIfSimulationResult {
  currentOutlook: FutureOutlook
  simulatedOutlook: FutureOutlook
  delta: WhatIfSimulationDelta
}
