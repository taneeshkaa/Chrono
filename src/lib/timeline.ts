import type {
  CommitmentImpactLevel,
  CommitmentPrediction,
  FutureTimelineEvent,
} from '@/types/simulation'

const WARNING_THRESHOLD = 0.7
const PREDICTION_THRESHOLD = 0.8
const ONE_DAY_MS = 24 * 60 * 60 * 1000

function severityFromFailureProbability(
  failureProbability: number
): CommitmentImpactLevel {
  if (failureProbability > 0.9) return 'CRITICAL'
  if (failureProbability > 0.8) return 'HIGH'
  if (failureProbability > 0.7) return 'MEDIUM'
  return 'LOW'
}

function shiftIsoDate(date: string, offsetDays: number): string {
  return new Date(new Date(date).getTime() + offsetDays * ONE_DAY_MS).toISOString()
}

function hasValidDeadline(
  prediction: CommitmentPrediction
): prediction is CommitmentPrediction & { deadline: string } {
  return Boolean(prediction.deadline && !Number.isNaN(new Date(prediction.deadline).getTime()))
}

function hasHighFailureProbabilityWithDeadline(
  prediction: CommitmentPrediction
): prediction is CommitmentPrediction & { deadline: string } {
  return prediction.failureProbability > PREDICTION_THRESHOLD && hasValidDeadline(prediction)
}

function hasConsequencesWithDeadline(
  prediction: CommitmentPrediction
): prediction is CommitmentPrediction & { deadline: string } {
  return hasValidDeadline(prediction) && prediction.consequenceAnalysis.consequences.length > 0
}

// ---------------------------------------------------------------------------
// Public API - FutureTimelineService
// ---------------------------------------------------------------------------

export function generateWarningEvents(
  predictions: CommitmentPrediction[],
  referenceDate: Date = new Date()
): FutureTimelineEvent[] {
  return predictions
    .filter((prediction) => prediction.failureProbability > WARNING_THRESHOLD)
    .map((prediction) => ({
      date: referenceDate.toISOString(),
      type: 'WARNING',
      title: `${prediction.title} risk increasing`,
      description: `${prediction.title} has a rising failure risk based on its current commitment signals.`,
      severity: severityFromFailureProbability(prediction.failureProbability),
    }))
}

export function generateDeadlineEvents(
  predictions: CommitmentPrediction[]
): FutureTimelineEvent[] {
  return predictions.filter(hasValidDeadline).map((prediction) => ({
    date: prediction.deadline,
    type: 'DEADLINE',
    title: `${prediction.title} deadline approaching`,
    description: `${prediction.title} is due at this deadline.`,
    severity: severityFromFailureProbability(prediction.failureProbability),
  }))
}

export function generatePredictionEvents(
  predictions: CommitmentPrediction[]
): FutureTimelineEvent[] {
  return predictions
    .filter(hasHighFailureProbabilityWithDeadline)
    .map((prediction) => ({
      date: shiftIsoDate(prediction.deadline, -1),
      type: 'PREDICTION',
      title: `High likelihood of missing ${prediction.title}`,
      description: `${prediction.title} has a high likelihood of being missed if current risk signals continue.`,
      severity: severityFromFailureProbability(prediction.failureProbability),
    }))
}

export function generateConsequenceEvents(
  predictions: CommitmentPrediction[]
): FutureTimelineEvent[] {
  return predictions
    .filter(hasConsequencesWithDeadline)
    .map((prediction) => {
      const firstConsequence = prediction.consequenceAnalysis.consequences[0]

      return {
        date: shiftIsoDate(prediction.deadline, 1),
        type: 'CONSEQUENCE',
        title: `Potential ${prediction.title} consequence`,
        description: firstConsequence,
        severity: prediction.consequenceAnalysis.impactLevel,
      }
    })
}

export function generateTimeline(
  predictions: CommitmentPrediction[],
  referenceDate: Date = new Date()
): FutureTimelineEvent[] {
  return [
    ...generateWarningEvents(predictions, referenceDate),
    ...generateDeadlineEvents(predictions),
    ...generatePredictionEvents(predictions),
    ...generateConsequenceEvents(predictions),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export const FutureTimelineService = {
  generateTimeline,
  generateWarningEvents,
  generateDeadlineEvents,
  generatePredictionEvents,
  generateConsequenceEvents,
}
