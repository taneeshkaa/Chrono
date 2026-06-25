import { auth } from '@/auth'
import { extractCommitments } from '@/lib/extractor'
import { fetchRecentEmails } from '@/lib/gmail'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

function shouldMarkDisconnected(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return (
    message.includes('No access token') ||
    message.includes('No refresh token') ||
    message.includes('Token refresh failed') ||
    message.includes('Gmail API request failed: 401') ||
    message.includes('Gmail API request failed: 403')
  )
}

async function getRefreshedAccessToken(connection: {
  id: string
  email: string
  connected: boolean
  accessToken: string | null
  refreshToken: string | null
  expiresAt: Date | null
}): Promise<string> {
  if (!connection.accessToken) throw new Error('No access token')

  const isExpired =
    !connection.expiresAt ||
    connection.expiresAt.getTime() - 5 * 60 * 1000 < Date.now()

  if (!isExpired) {
    return connection.accessToken
  }

  if (!connection.refreshToken) {
    throw new Error('No refresh token; user must reconnect Gmail')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken,
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`)

  const tokens = await res.json()

  await prisma.connection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  })

  return tokens.access_token
}

export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit the request
  const identifier = session.user.id
  const rateLimitResult = await rateLimit('sync-gmail', identifier)
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const gmailConnections = await prisma.connection.findMany({
    where: {
      userId: session.user.id,
      provider: 'gmail',
    },
  })
  const connections = gmailConnections.filter((connection) => connection.connected)

  if (connections.length === 0) {

    return NextResponse.json(
      {
        success: false,
        error: 'No connected Gmail accounts found. Reconnect Gmail from the Connections page.',
        commitmentsFound: 0,
      },
      { status: 400 },
    )
  }

  let commitmentsFound = 0
  let emailsProcessed = 0
  let emailsSkipped = 0
  let duplicatesSkipped = 0
  const extractionErrors: string[] = []
  const syncErrors: Array<{
    connectionId: string
    email: string
    error: string
  }> = []

  for (const connection of connections) {
    try {
      const accessToken = await getRefreshedAccessToken(connection)
      const emails = await fetchRecentEmails(accessToken)
      emailsProcessed += emails.length

      const summary = await extractCommitments(emails, session.user.id)
      commitmentsFound += summary.commitmentsExtracted
      emailsSkipped += summary.emailsSkipped
      duplicatesSkipped += summary.duplicatesSkipped
      extractionErrors.push(...summary.errors)
    } catch (err) {
      logger.error(`Failed to sync connection ${connection.id}`, {
        error: err instanceof Error ? err.message : String(err),
      })
      syncErrors.push({
        connectionId: connection.id,
        email: connection.email,
        error: err instanceof Error ? err.message : String(err),
      })

      if (shouldMarkDisconnected(err)) {
        await prisma.connection.update({
          where: { id: connection.id },
          data: { connected: false },
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    commitmentsFound,
    debug: {
      connectionsProcessed: connections.length,
      emailsProcessed,
      emailsSkipped,
      commitmentsExtracted: commitmentsFound,
      duplicatesSkipped,
      errors: syncErrors,
      extractionErrors,
    },
  })
}
