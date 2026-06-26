import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyJwt } from '@/lib/jwt'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const MESSAGE_PREVIEW_LENGTH = 500

type GroqMessage = {
  role: string
  content: string
}

type ConversationPreview = {
  title: string
  messages: { role: string; content: string }[]
}

type AnalyzedContext = {
  contextName: string
  completed: string[]
  lastCheckpoint: string
  nextAction: string
  estimatedTime: number
  summary: string
}

function buildConversationPreviews(
  conversations: { title: string; rawData: unknown }[],
): ConversationPreview[] {
  return conversations.map((conv) => {
    const messages = Array.isArray(conv.rawData) ? conv.rawData : []
    return {
      title: conv.title,
      messages: messages.map((msg: GroqMessage) => ({
        role: String(msg.role || 'user'),
        content: String(msg.content || '').slice(0, MESSAGE_PREVIEW_LENGTH),
      })),
    }
  })
}

function buildPrompt(previews: ConversationPreview[]): string {
  return `You are an AI context analyzer.

The user has had the following AI conversations recently:
${JSON.stringify(previews, null, 2)}

Your tasks:
1. Cluster these conversations into named contexts (e.g. "DSA", "Work Project", "Java Learning")
2. For each context identify:
   - contextName: short descriptive name
   - completed: array of topics/tasks the user has finished
   - lastCheckpoint: the most recent specific thing they worked on
   - nextAction: what they should logically do next
   - estimatedTime: estimated minutes to complete next action
   - summary: one sentence describing this context
3. Merge conversations that belong to the same context
4. Return ONLY a valid JSON array, no explanation, no markdown:
[
  {
    "contextName": "DSA",
    "completed": ["Sliding Window", "Minimum Window Substring"],
    "lastCheckpoint": "Minimum Window Substring",
    "nextAction": "Longest Repeating Character Replacement",
    "estimatedTime": 45,
    "summary": "User is practicing sliding window DSA problems"
  }
]`
}

function parseGroqJsonResponse(text: string): AnalyzedContext[] {
  // Strip markdown code fences if present
  let cleaned = text.trim()

  // Handle ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  }

  const parsed = JSON.parse(cleaned)

  if (!Array.isArray(parsed)) {
    throw new Error('Groq response is not a JSON array')
  }

  return parsed
}

// POST /api/ai/analyze-context
// Fetches unprocessed conversations, sends to Groq, upserts ContextMemory
export async function POST(request: Request) {
  let userId: string | null = null

  // 1. Try cookie session auth
  const session = await auth()
  if (session?.user?.id) {
    userId = session.user.id
  }

  // 2. If no session, try Bearer Token auth
  if (!userId) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyJwt(token)
      if (payload && payload.userId) {
        userId = payload.userId
      }
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch unprocessed conversations
    const unprocessed = await prisma.conversationSource.findMany({
      where: {
        userId,
        processed: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    if (unprocessed.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'nothing to process',
      })
    }

    // 2. Build previews and prompt
    const previews = buildConversationPreviews(unprocessed)
    const prompt = buildPrompt(previews)

    // 3. Call Groq
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured')
    }

    const groqResponse = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq API error:', groqResponse.status, errorText)
      return NextResponse.json(
        { success: false, error: `Groq API failed: ${groqResponse.status}` },
        { status: 500 },
      )
    }

    const groqData = await groqResponse.json()
    const rawContent = groqData.choices?.[0]?.message?.content ?? ''

    // 4. Parse Groq response
    let contexts: AnalyzedContext[]
    try {
      contexts = parseGroqJsonResponse(rawContent)
    } catch (parseError) {
      console.error('Failed to parse Groq response:', rawContent)
      return NextResponse.json(
        { success: false, error: 'Groq returned invalid JSON' },
        { status: 500 },
      )
    }

    // 5. Determine the primary source platform from the conversations
    const primarySource = unprocessed[0]?.source?.toLowerCase() || 'chatgpt'

    // 6. Upsert each context into ContextMemory
    let contextsUpdated = 0
    for (const ctx of contexts) {
      if (!ctx.contextName) continue

      const existing = await prisma.contextMemory.findFirst({
        where: {
          userId,
          contextName: ctx.contextName,
        },
      })

      if (existing) {
        await prisma.contextMemory.update({
          where: { id: existing.id },
          data: {
            completed: ctx.completed || [],
            lastCheckpoint: ctx.lastCheckpoint || null,
            nextAction: ctx.nextAction || null,
            estimatedTime: ctx.estimatedTime || null,
            summary: ctx.summary || null,
            source: primarySource,
            status: 'ACTIVE',
            lastWorkedAt: new Date(),
          },
        })
      } else {
        await prisma.contextMemory.create({
          data: {
            userId,
            contextName: ctx.contextName,
            source: primarySource,
            status: 'ACTIVE',
            completed: ctx.completed || [],
            lastCheckpoint: ctx.lastCheckpoint || null,
            nextAction: ctx.nextAction || null,
            estimatedTime: ctx.estimatedTime || null,
            summary: ctx.summary || null,
            lastWorkedAt: new Date(),
          },
        })
      }

      contextsUpdated++
    }

    // 7. Mark all fetched ConversationSource records as processed
    await prisma.conversationSource.updateMany({
      where: {
        id: { in: unprocessed.map((c) => c.id) },
      },
      data: { processed: true },
    })

    return NextResponse.json({
      success: true,
      contextsUpdated,
    })
  } catch (error) {
    console.error('POST /api/ai/analyze-context error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
