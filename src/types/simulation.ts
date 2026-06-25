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
}

export interface SimulationResult {
  userId: string
  simulatedAt: string
  overallSuccessProbability: number
  totalActive: number
  totalAtRisk: number
  predictions: CommitmentPrediction[]
}
