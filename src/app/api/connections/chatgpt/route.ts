import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyJwt } from '@/lib/jwt'
import type { ConversationPlatform } from '@prisma/client'

const VALID_SOURCES: Record<string, ConversationPlatform> = {
  chatgpt: 'CHATGPT',
  claude: 'CLAUDE',
  gemini: 'GEMINI',
}

// POST /api/connections/chatgpt
// Receives conversation data sent from the browser extension
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
    const body = await request.json()
    const { source, conversationId, title, messages } = body

    // Validate required fields
    if (!source || typeof source !== 'string') {
      return NextResponse.json({ error: 'Missing required field: source' }, { status: 400 })
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing required field: messages (must be a non-empty array)' }, { status: 400 })
    }

    const platform = VALID_SOURCES[source.toLowerCase()]
    if (!platform) {
      return NextResponse.json(
        { error: `Invalid source: "${source}". Must be one of: chatgpt, claude, gemini` },
        { status: 400 },
      )
    }

    const externalConversationId = conversationId || null

    // Upsert: match on userId + externalConversationId + source
    let saved

    if (externalConversationId) {
      const existing = await prisma.conversationSource.findFirst({
        where: {
          userId,
          externalConversationId,
          source: platform,
        },
      })

      if (existing) {
        saved = await prisma.conversationSource.update({
          where: { id: existing.id },
          data: {
            rawData: messages,
            title,
            processed: false,
          },
        })
      } else {
        saved = await prisma.conversationSource.create({
          data: {
            userId,
            source: platform,
            externalConversationId,
            title,
            rawData: messages,
          },
        })
      }
    } else {
      // No external ID — always create a new record
      saved = await prisma.conversationSource.create({
        data: {
          userId,
          source: platform,
          externalConversationId: null,
          title,
          rawData: messages,
        },
      })
    }

    // Fire-and-forget: trigger context analysis
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    fetch(`${baseUrl}/api/ai/analyze-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
        Authorization: request.headers.get('Authorization') || '',
      },
    }).catch((err) => {
      console.error('Failed to trigger context analysis:', err)
    })

    return NextResponse.json({
      success: true,
      conversationId: saved.id,
    })
  } catch (error) {
    console.error('POST /api/connections/chatgpt error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

// GET /api/connections/chatgpt
// Returns connection status for ChatGPT, Claude, and Gemini
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const counts = await prisma.conversationSource.groupBy({
      by: ['source'],
      where: {
        userId,
      },
      _count: {
        id: true,
      },
    })

    const connectedMap = {
      chatgpt: false,
      claude: false,
      gemini: false,
    }

    counts.forEach((item) => {
      const sourceKey = item.source.toLowerCase() as keyof typeof connectedMap
      if (sourceKey in connectedMap) {
        connectedMap[sourceKey] = item._count.id > 0
      }
    })

    return NextResponse.json({
      success: true,
      connected: connectedMap,
    })
  } catch (error) {
    console.error('GET /api/connections/chatgpt error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}

