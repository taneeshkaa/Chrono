import { auth } from '@/auth'
import { generateDailySummary } from '@/lib/notifications'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await generateDailySummary(session.user.id)
  return NextResponse.json(summary)
}
