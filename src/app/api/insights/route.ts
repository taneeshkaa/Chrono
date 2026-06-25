import { auth } from '@/auth'
import { generateInsights } from '@/lib/insights'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const identifier = session.user.id
  const rateLimitResult = await rateLimit('api-insights', identifier)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const insights = await generateInsights(session.user.id)
    return NextResponse.json(insights)
  } catch (error) {
    logger.error('Failed to generate insights', { userId: session.user.id, error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
