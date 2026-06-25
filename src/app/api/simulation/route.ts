import { auth } from '@/auth'
import { runSimulation } from '@/lib/simulation'
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
  const rateLimitResult = await rateLimit('api-simulation', identifier)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const result = await runSimulation(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Simulation endpoint failed', { userId: session.user.id, error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
