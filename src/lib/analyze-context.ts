import { prisma } from '@/lib/prisma'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const ASSISTANT_PREVIEW_LENGTH = 1000

type ConversationSource = {
  id: string
  title: string
  rawData: unknown
  source: string
}

async function filterRelevantConversations(conversations: ConversationSource[]): Promise<ConversationSource[]> {
  let candidates = []
  for (const conv of conversations) {
    const messages = Array.isArray(conv.rawData) ? conv.rawData : []
    const messageCount = messages.length
    let totalContentLength = 0
    let preview = ''
    for (const msg of messages) {
      const m = msg as { content?: string }
      const content = String(m.content || '')
      totalContentLength += content.length
      if (preview.length < 200) {
        preview += content
      }
    }
    if (messageCount < 3) continue
    if (totalContentLength < 200) continue
    candidates.push({ ...conv, messageCount, preview: preview.slice(0, 200) })
  }
  if (candidates.length === 0) return []

  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY missing')

    const conversationList = candidates.map(c => JSON.stringify({ id: c.id, title: c.title, messageCount: c.messageCount, preview: c.preview })).join('\n')

    const prompt = `You are filtering AI conversations for a productivity tracker.

Keep ONLY conversations that are about:
- Learning a skill (coding, DSA, languages, frameworks, courses)
- Working on a project (building apps, designing, writing)
- Professional tasks (job prep, interviews, research, planning)
- Personal goals (fitness, finance, habits, career)

IGNORE conversations that are:
- Casual greetings (hi, hello, how are you)
- Single question answers with no depth
- Random or nonsensical exchanges
- Test messages
- General chitchat with no productive purpose

For each conversation below, return ONLY a JSON array of the IDs
that should be KEPT:

Conversations:
${conversationList}

Return format: { keep: [id1, id2, ...] }
Only include IDs worth tracking for productivity purposes.`

    const groqResponse = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 1000,
      }),
    })

    if (!groqResponse.ok) {
      console.error('Groq filter API error')
      return conversations
    }

    const groqData = await groqResponse.json()
    const rawContent = groqData.choices?.[0]?.message?.content ?? ''
    let cleaned = rawContent.trim()
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim()
    } else {
      const firstBrace = cleaned.indexOf('{')
      const lastBrace = cleaned.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1)
      }
    }
    const parsed = JSON.parse(cleaned) as { keep: string[] }
    const keepIds = new Set(parsed.keep || [])
    return conversations.filter(c => keepIds.has(c.id))
  } catch (e) {
    console.error('Error in filterRelevantConversations, failing open:', e)
    return conversations
  }
}

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

export type AnalysisResult = {
  success: true
  message?: string
  contextsUpdated?: number
}

function buildConversationPreviews(
  conversations: { title: string; rawData: unknown }[],
): ConversationPreview[] {
  return conversations.map((conv) => {
    const messages = Array.isArray(conv.rawData) ? conv.rawData : []
    return {
      title: conv.title,
      messages: messages.map((msg) => {
        const message = msg as Partial<GroqMessage>
        const role = String(message.role || 'user').toLowerCase()
        const content = String(message.content || '')

        return {
          role,
          content: role === 'assistant' ? content.slice(0, ASSISTANT_PREVIEW_LENGTH) : content,
        }
      }),
    }
  })
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function formatConversations(previews: ConversationPreview[]): string {
  return previews
    .map((preview) => {
      const messages = preview.messages
        .map((message) => `${formatRole(message.role)}: ${message.content}`)
        .join('\n')

      return `Conversation: ${preview.title}
Messages:
${messages}`
    })
    .join('\n\n')
}

function buildPrompt(previews: ConversationPreview[], ignoredContextNames: string[]): string {
  const conversations = formatConversations(previews)

  return `You are analyzing a user's AI conversation history to understand their learning/work progress.

IMPORTANT: Read the ENTIRE conversation carefully, not just the title or last message. Identify what the user has genuinely completed vs what they are currently working on.

For lastCheckpoint: identify the LAST COMPLETE topic the user finished, not what they're currently stuck on.

For nextAction: identify the logical NEXT step after what they completed, based on the conversation flow.

Do NOT create contexts for these deleted/ignored topics: ${JSON.stringify(ignoredContextNames)}

Conversations:
${conversations}

Return ONLY valid JSON array matching this shape:
[
  {
    "contextName": "string",
    "completed": ["string"],
    "lastCheckpoint": "string (last thing fully completed)",
    "nextAction": "string (what comes next logically)",
    "estimatedTime": 45,
    "summary": "string (one sentence)"
  }
]`
}

function parseGroqJsonResponse(text: string): AnalyzedContext[] {
  let cleaned = text.trim()

  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  } else {
    const firstBracket = cleaned.indexOf('[')
    const lastBracket = cleaned.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1)
    }
  }

  const parsed = JSON.parse(cleaned)

  if (!Array.isArray(parsed)) {
    throw new Error('Groq response is not a JSON array')
  }

  return parsed
}

export async function runAnalysis(userId: string): Promise<AnalysisResult> {
  const unprocessed = await prisma.conversationSource.findMany({
    where: {
      userId,
      processed: false,
      ignoredContextName: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (unprocessed.length === 0) {
    return {
      success: true,
      message: 'nothing to process',
    }
  }

  const relevant = await filterRelevantConversations(unprocessed)
  if (relevant.length === 0) {
    await prisma.conversationSource.updateMany({
      where: { id: { in: unprocessed.map(c => c.id) } },
      data: { processed: true },
    })
    return { success: true, contextsUpdated: 0 }
  }

  const ignoredSources = await prisma.conversationSource.findMany({
    where: {
      userId,
      ignoredContextName: { not: null },
    },
    select: {
      ignoredContextName: true,
    },
    distinct: ['ignoredContextName'],
  })
  const deletedContexts = await prisma.contextMemory.findMany({
    where: {
      userId,
      deleted: true,
    },
    select: {
      contextName: true,
    },
  })
  const ignoredContextNames = Array.from(new Set([
    ...ignoredSources
    .map((source) => source.ignoredContextName)
    .filter((name): name is string => Boolean(name)),
    ...deletedContexts.map((context) => context.contextName),
  ]))

  const previews = buildConversationPreviews(relevant)
  const prompt = buildPrompt(previews, ignoredContextNames)

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
      max_tokens: 2000,
    }),
  })

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text()
    console.error('Groq API error:', groqResponse.status, errorText)
    throw new Error(`Groq API failed: ${groqResponse.status}`)
  }

  const groqData = await groqResponse.json()
  const rawContent = groqData.choices?.[0]?.message?.content ?? ''

  let contexts: AnalyzedContext[]
  try {
    contexts = parseGroqJsonResponse(rawContent)
  } catch {
    console.error('Failed to parse Groq response:', rawContent)
    throw new Error('Groq returned invalid JSON')
  }

  const primarySource = relevant[0]?.source?.toLowerCase() || 'chatgpt'

  let contextsUpdated = 0
  for (const ctx of contexts) {
    if (!ctx.contextName) continue

    const deletedContext = await prisma.contextMemory.findFirst({
      where: {
        userId,
        contextName: { equals: ctx.contextName, mode: 'insensitive' },
        deleted: true,
      },
    })

    if (deletedContext) continue

    const existing = await prisma.contextMemory.findFirst({
      where: {
        userId,
        contextName: { equals: ctx.contextName, mode: 'insensitive' },
        deleted: false,
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

  await prisma.conversationSource.updateMany({
    where: {
      id: { in: unprocessed.map((c) => c.id) },
    },
    data: { processed: true },
  })

  return {
    success: true,
    contextsUpdated,
  }
}
