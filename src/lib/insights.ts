import { prisma } from './prisma'
import { CommitmentStatus } from '@prisma/client'
import { logger } from './logger'
import { getErrorMessage } from './errors'
import { retry } from './retry'

export type Insight = {
  title: string
  description: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}

type CommitmentSummary = {
  totalCommitments: number
  activeCommitments: number
  discoveredCommitments: number
  missedCommitments: number
  deadlinesWithin7Days: number
  deadlinesWithin30Days: number
  highestRiskCommitment: {
    title: string
    riskScore: number
    deadline: string | null
    category: string
  } | null
  averageRisk: number
  categoryDistribution: Record<string, number>
  overdueCommitments: number
}

export function parseInsights(data: unknown): Insight[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map(item => {
      if (!item || typeof item !== 'object') {
        return null
      }

      const title = typeof item.title === 'string' ? item.title : 'Insight'
      const description = typeof item.description === 'string' ? item.description : 'No description'
      let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'

      if (item.priority === 'HIGH' || item.priority === 'MEDIUM' || item.priority === 'LOW') {
        priority = item.priority
      }

      return { title, description, priority }
    })
    .filter((item): item is Insight => item !== null)
    .slice(0, 5)
}

export async function generateInsights(userId: string): Promise<Insight[]> {
  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const commitments = await prisma.commitment.findMany({
    where: {
      userId,
      status: {
        notIn: [CommitmentStatus.COMPLETED, CommitmentStatus.ARCHIVED],
      },
    },
  })

  const totalCommitments = commitments.length
  const activeCommitments = commitments.filter(c => c.status === CommitmentStatus.ACTIVE).length
  const discoveredCommitments = commitments.filter(c => c.status === CommitmentStatus.DISCOVERED).length
  const missedCommitments = commitments.filter(c => c.status === CommitmentStatus.MISSED).length

  const deadlinesWithin7Days = commitments.filter(c =>
    c.deadline && c.deadline <= sevenDaysFromNow && c.deadline >= now
  ).length

  const deadlinesWithin30Days = commitments.filter(c =>
    c.deadline && c.deadline <= thirtyDaysFromNow && c.deadline >= now
  ).length

  const overdueCommitments = commitments.filter(c =>
    c.deadline && c.deadline < now
  ).length

  const highestRiskCommitment = commitments.reduce(
    (max, c) => (!max || c.riskScore > max.riskScore ? c : max),
    null as typeof commitments[0] | null
  )

  const averageRisk =
    commitments.length > 0 ? commitments.reduce((sum, c) => sum + c.riskScore, 0) / commitments.length : 0

  const categoryDistribution = commitments.reduce(
    (acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const summary: CommitmentSummary = {
    totalCommitments,
    activeCommitments,
    discoveredCommitments,
    missedCommitments,
    deadlinesWithin7Days,
    deadlinesWithin30Days,
    highestRiskCommitment: highestRiskCommitment
      ? {
          title: highestRiskCommitment.title,
          riskScore: highestRiskCommitment.riskScore,
          deadline: highestRiskCommitment.deadline?.toISOString() || null,
          category: highestRiskCommitment.category,
        }
      : null,
    averageRisk,
    categoryDistribution,
    overdueCommitments,
  }

  logger.info('AI INSIGHTS SUMMARY', summary)

  try {
    const insights = await retry(async () => {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'user',
              content: `You are an AI productivity coach. Analyze the user's commitment summary and generate 3-5 useful insights. Focus on workload, deadlines, neglected commitments, risk, prioritization, and productivity recommendations. Return ONLY JSON. Format: [{"title":"...","description":"...","priority":"HIGH"}]`,
            },
            {
              role: 'user',
              content: `Commitment Summary: ${JSON.stringify(summary)}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      })

      if (!response.ok) {
        throw new Error(`Groq API failed: ${response.status}`)
      }

      const result = await response.json()
      const content = result.choices?.[0]?.message?.content

      if (!content) {
        return []
      }

      let parsedJson
      try {
        parsedJson = JSON.parse(content)
      } catch {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0])
        } else {
          return []
        }
      }

      const parsedInsights = parseInsights(parsedJson)
      logger.info('AI INSIGHTS GENERATED', parsedInsights)
      return parsedInsights
    }, { retries: 3, delay: 1000 })

    return insights
  } catch (error) {
    logger.error('AI INSIGHTS ERROR', { message: getErrorMessage(error) })
    return []
  }
}
