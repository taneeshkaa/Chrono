import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { runAnalysis } from '@/lib/analyze-context'
import { verifyJwt } from '@/lib/jwt'

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
    const result = await runAnalysis(userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('POST /api/ai/analyze-context error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
