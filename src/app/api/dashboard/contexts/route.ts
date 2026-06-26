import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/dashboard/contexts
// Returns active ContextMemory entries for the authenticated user
export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const contexts = await prisma.contextMemory.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: [
        { lastWorkedAt: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
      ],
      take: 10,
      select: {
        id: true,
        contextName: true,
        lastCheckpoint: true,
        nextAction: true,
        estimatedTime: true,
        summary: true,
        completed: true,
        lastWorkedAt: true,
        source: true,
      },
    })

    return NextResponse.json({
      success: true,
      contexts,
    })
  } catch (error) {
    console.error('GET /api/dashboard/contexts error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
