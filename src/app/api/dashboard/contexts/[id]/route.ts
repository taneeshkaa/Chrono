import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  try {
    const existing = await prisma.contextMemory.findFirst({
      where: {
        id,
        userId,
        deleted: false,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Context not found' }, { status: 404 })
    }

    const deletedAt = new Date()

    await prisma.$transaction([
      prisma.contextMemory.update({
        where: { id },
        data: {
          deleted: true,
          deletedAt,
        },
      }),
      prisma.conversationSource.updateMany({
        where: {
          userId,
          processed: true,
          OR: [
            { title: { contains: existing.contextName, mode: 'insensitive' } },
            { summary: { contains: existing.contextName, mode: 'insensitive' } },
          ],
        },
        data: {
          ignoredContextName: existing.contextName,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/dashboard/contexts/[id] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
