import { auth } from '@/auth'
import { generateNotifications } from '@/lib/notifications'
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
  const rateLimitResult = await rateLimit('api-notifications', identifier)
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const notifications = await generateNotifications(session.user.id)
    return NextResponse.json(notifications)
  } catch (error) {
    logger.error('Failed to generate notifications', { userId: session.user.id, error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
