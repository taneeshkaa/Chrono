import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

function mapCategory(category: string): 'ACADEMIC' | 'CAREER' | 'PERSONAL' | 'FINANCE' {
  const upper = category?.toUpperCase() || ''
  if (upper === 'LEARNING' || upper === 'ACADEMIC') return 'ACADEMIC'
  if (upper === 'WORK' || upper === 'CAREER') return 'CAREER'
  if (upper === 'FINANCE') return 'FINANCE'
  return 'PERSONAL' // Defaults to PERSONAL (including HEALTH)
}

function mapPriority(priority: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const upper = priority?.toUpperCase() || ''
  if (upper === 'LOW') return 'LOW'
  if (upper === 'MEDIUM') return 'MEDIUM'
  if (upper === 'HIGH') return 'HIGH'
  if (upper === 'URGENT' || upper === 'CRITICAL') return 'CRITICAL'
  return 'MEDIUM'
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    const body = await request.json()
    const { title, description, deadline, userId } = body

    const finalUserId = userId || session?.user?.id

    if (!finalUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured' }, { status: 500 })
    }

    const commitmentText = `${title.trim()}${description ? ` - ${description.trim()}` : ''}`
    const prompt = `Analyze this commitment and return JSON only:
{
  category: one of LEARNING/WORK/PERSONAL/HEALTH/FINANCE,
  priority: one of LOW/MEDIUM/HIGH/URGENT,
  estimatedEffort: number in minutes,
  suggestion: one sentence advice on when/how to tackle this
}
Commitment: ${commitmentText}`

    const groqResponse = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0,
      }),
    })

    if (!groqResponse.ok) {
      throw new Error(`Groq API request failed: ${groqResponse.status} ${await groqResponse.text()}`)
    }

    const responseData = await groqResponse.json()
    const rawContent = responseData.choices?.[0]?.message?.content ?? ''

    // Parse JSON
    const cleaned = rawContent
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim()

    let aiData: {
      category?: string
      priority?: string
      estimatedEffort?: number
      suggestion?: string
    } = {}

    try {
      aiData = JSON.parse(cleaned)
    } catch {
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start !== -1 && end !== -1 && end > start) {
        try {
          aiData = JSON.parse(cleaned.slice(start, end + 1))
        } catch (e) {
          console.error('Failed to parse inner JSON from Groq:', e)
        }
      }
    }

    const categoryVal = mapCategory(aiData.category || 'PERSONAL')
    const priorityVal = mapPriority(aiData.priority || 'MEDIUM')
    const effortVal = aiData.estimatedEffort ? Number(aiData.estimatedEffort) : null
    const suggestionVal = aiData.suggestion || null

    const commitment = await prisma.commitment.create({
      data: {
        userId: finalUserId,
        title: title.trim(),
        description: description?.trim() || null,
        category: categoryVal,
        priority: priorityVal,
        status: 'ACTIVE',
        deadline: deadline ? new Date(deadline) : null,
        estimatedEffort: effortVal,
        aiSummary: suggestionVal,
      },
    })

    return NextResponse.json(commitment)
  } catch (error) {
    console.error('Failed in POST /api/commitments/analyze-new:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
