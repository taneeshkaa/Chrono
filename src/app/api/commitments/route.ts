import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { recalculateAllRisks } from '@/lib/risk'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()

  console.log('AUTH RESULT:', session)
  console.log('AUTH USER:', session?.user)
  console.log('AUTH USER EMAIL:', session?.user?.email)
  console.log('AUTH USER ID:', session?.user?.id)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('DASHBOARD COMMITMENTS QUERY USER:', {
    id: session.user.id,
    email: session.user.email,
  })

  await recalculateAllRisks()

  const commitments = await prisma.commitment.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log('DASHBOARD COMMITMENTS:', commitments.length)
  console.log(
    'DASHBOARD COMMITMENT IDS:',
    commitments.slice(0, 10).map((commitment) => ({
      id: commitment.id,
      title: commitment.title,
      status: commitment.status,
      userId: commitment.userId,
    })),
  )

  return NextResponse.json(commitments)
}
