import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { recalculateAllRisks } from '@/lib/risk'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await recalculateAllRisks()

  const commitments = await prisma.commitment.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json(commitments)
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, category, priority, deadline, estimatedEffort } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const commitment = await prisma.commitment.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        description: description?.trim() || null,
        category: category || 'PERSONAL',
        priority: priority || 'MEDIUM',
        status: 'ACTIVE',
        deadline: deadline ? new Date(deadline) : null,
        estimatedEffort: estimatedEffort ? parseInt(estimatedEffort) : null,
      },
    })

    return NextResponse.json(commitment)
  } catch (error) {
    console.error('Failed to create commitment:', error)
    return NextResponse.json({ error: 'Failed to create commitment' }, { status: 500 })
  }
}
