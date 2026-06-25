import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { recalculateCommitmentRisk } from '@/lib/risk'
import type { Category, CommitmentStatus, Priority } from '@prisma/client'
import { NextResponse } from 'next/server'

const VALID_CATEGORIES: Category[] = [
  'ACADEMIC',
  'CAREER',
  'PERSONAL',
  'FINANCE',
]

const VALID_PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const VALID_STATUSES: CommitmentStatus[] = [
  'DISCOVERED',
  'ACTIVE',
  'AT_RISK',
  'COMPLETED',
  'MISSED',
  'ARCHIVED',
]

type UpdateCommitmentBody = {
  title?: unknown
  description?: unknown
  priority?: unknown
  category?: unknown
  deadline?: unknown
  status?: unknown
}

function parseDeadline(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function buildUpdateData(body: UpdateCommitmentBody) {
  const data: {
    title?: string
    description?: string | null
    priority?: Priority
    category?: Category
    deadline?: Date | null
    status?: CommitmentStatus
  } = {}

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return { error: 'Title must be a non-empty string' as const }
    }

    data.title = body.title.trim()
  }

  if (body.description !== undefined) {
    if (body.description === null) {
      data.description = null
    } else if (typeof body.description === 'string') {
      data.description =
        body.description.trim().length > 0 ? body.description.trim() : null
    } else {
      return { error: 'Description must be a string or null' as const }
    }
  }

  if (body.priority !== undefined) {
    if (
      typeof body.priority !== 'string' ||
      !VALID_PRIORITIES.includes(body.priority as Priority)
    ) {
      return { error: 'Invalid priority' as const }
    }

    data.priority = body.priority as Priority
  }

  if (body.category !== undefined) {
    if (
      typeof body.category !== 'string' ||
      !VALID_CATEGORIES.includes(body.category as Category)
    ) {
      return { error: 'Invalid category' as const }
    }

    data.category = body.category as Category
  }

  if (body.deadline !== undefined) {
    const deadline = parseDeadline(body.deadline)

    if (deadline === null && body.deadline !== null && body.deadline !== '') {
      return { error: 'Invalid deadline' as const }
    }

    data.deadline = deadline ?? null
  }

  if (body.status !== undefined) {
    if (
      typeof body.status !== 'string' ||
      !VALID_STATUSES.includes(body.status as CommitmentStatus)
    ) {
      return { error: 'Invalid status' as const }
    }

    data.status = body.status as CommitmentStatus
  }

  if (Object.keys(data).length === 0) {
    return { error: 'No valid fields to update' as const }
  }

  return { data }
}

async function getOwnedCommitment(id: string, userId: string) {
  return prisma.commitment.findFirst({
    where: {
      id,
      userId,
    },
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = (await request.json()) as UpdateCommitmentBody
  const result = buildUpdateData(body)

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const existing = await getOwnedCommitment(id, session.user.id)

  if (!existing) {
    return NextResponse.json({ error: 'Commitment not found' }, { status: 404 })
  }

  const updated = await prisma.commitment.update({
    where: { id },
    data: result.data,
  })

  if (result.data.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
    console.log('COMMITMENT ACTIVATED:', {
      commitmentId: id,
      userId: session.user.id,
    })
  }

  if (result.data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
    console.log('COMMITMENT COMPLETED:', {
      commitmentId: id,
      userId: session.user.id,
    })
  }

  if (result.data.status === 'ARCHIVED' && existing.status !== 'ARCHIVED') {
    console.log('COMMITMENT ARCHIVED:', {
      commitmentId: id,
      userId: session.user.id,
    })
  }

  console.log('COMMITMENT UPDATED:', {
    commitmentId: id,
    userId: session.user.id,
    fields: Object.keys(result.data),
  })

  const riskUpdated = await recalculateCommitmentRisk(id)

  return NextResponse.json(riskUpdated || updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const existing = await getOwnedCommitment(id, session.user.id)

  if (!existing) {
    return NextResponse.json({ error: 'Commitment not found' }, { status: 404 })
  }

  await prisma.commitment.delete({
    where: { id },
  })

  console.log('COMMITMENT DELETED:', {
    commitmentId: id,
    userId: session.user.id,
  })

  return NextResponse.json({ success: true })
}
