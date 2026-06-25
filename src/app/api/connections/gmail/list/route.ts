import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const connections = await prisma.connection.findMany({
    where: {
      userId: session.user.id,
      provider: 'gmail',
    },
    select: {
      id: true,
      email: true,
      connected: true,
      createdAt: true,
    },
  })

  return new Response(JSON.stringify(connections), {
    headers: { 'Content-Type': 'application/json' },
  })
}
