import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { signJwt } from '@/lib/jwt'

export async function POST() {
  const session = await auth()

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = signJwt({
    userId: session.user.id,
    email: session.user.email,
  })

  return NextResponse.json({
    token,
    email: session.user.email,
  })
}
