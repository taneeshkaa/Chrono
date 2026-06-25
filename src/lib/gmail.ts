export type EmailData = {
  id: string
  subject: string
  from: string
  date: string
  body: string
}

type GmailMessageListResponse = {
  messages?: Array<{ id: string }>
}

type GmailMessagePart = {
  mimeType?: string
  body?: {
    data?: string
  }
  parts?: GmailMessagePart[]
}

type GmailHeader = {
  name: string
  value: string
}

type GmailMessageResponse = {
  id: string
  payload?: GmailMessagePart & {
    headers?: GmailHeader[]
  }
}

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1/users/me'
const GMAIL_SEARCH_QUERY = ''

async function gmailFetch<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Gmail API request failed: ${response.status} ${await response.text()}`)
  }

  return response.json() as Promise<T>
}

function getHeader(headers: GmailHeader[] = [], name: string) {
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function decodeBase64Url(data: string) {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')

  return Buffer.from(padded, 'base64').toString('utf-8')
}

function extractBody(payload?: GmailMessagePart): string {
  if (!payload) {
    return ''
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  const directPartWithBody = payload.parts?.find((part) => part.body?.data)

  if (directPartWithBody?.body?.data) {
    return decodeBase64Url(directPartWithBody.body.data)
  }

  for (const part of payload.parts ?? []) {
    const nestedBody = extractBody(part)

    if (nestedBody) {
      return nestedBody
    }
  }

  return ''
}

export async function fetchRecentEmails(accessToken: string): Promise<EmailData[]> {
  const query = new URLSearchParams({
    maxResults: '5',
    q: GMAIL_SEARCH_QUERY,
  })


  const listResponse = await gmailFetch<GmailMessageListResponse>(
    `${GMAIL_API_BASE}/messages?${query.toString()}`,
    accessToken,
  )

  const messages = listResponse.messages ?? []

  const emails = await Promise.all(
    messages.map(async ({ id }) => {
      const message = await gmailFetch<GmailMessageResponse>(
        `${GMAIL_API_BASE}/messages/${id}?format=full`,
        accessToken,
      )

      const headers = message.payload?.headers ?? []

      return {
        id: message.id,
        subject: getHeader(headers, 'Subject'),
        from: getHeader(headers, 'From'),
        date: getHeader(headers, 'Date'),
        body: extractBody(message.payload),
      }
    }),
  )


  return emails
}
