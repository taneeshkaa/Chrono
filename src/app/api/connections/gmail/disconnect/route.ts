import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request) {
  const session = await auth()

  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { connectionId } = await request.json()

  if (!connectionId) {
    return new Response(JSON.stringify({ error: 'Missing connectionId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const connection = await prisma.connection.findFirst({
    where: {
      id: connectionId,
      userId: session.user.id,
    },
  })

  if (!connection) {
    return new Response(JSON.stringify({ error: 'Connection not found or unauthorized' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await prisma.connection.delete({
    where: {
      id: connectionId,
    },
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
