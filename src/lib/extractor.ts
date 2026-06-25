import { prisma } from '@/lib/prisma'
import { calculateRiskScore } from '@/lib/risk'
import type { EmailData } from '@/lib/gmail'
import type { Category, Priority, CommitmentStatus } from '@prisma/client'

type LLMResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

type RawCommitment = {
  title?: unknown
  description?: unknown
  category?: unknown
  priority?: unknown
  deadline?: unknown
  sourceEmailSubject?: unknown
}

type NormalizedCommitment = {
  title: string
  description: string | null
  category: Category
  priority: Priority
  deadline: Date | null
  sourceEmailSubject: string | null
}

export type EmailClassification =
  | 'ACTIONABLE'
  | 'INFORMATIONAL'
  | 'PROMOTIONAL'
  | 'NEWSLETTER'
  | 'SOCIAL'

export type ExtractionSummary = {
  emailsProcessed: number
  emailsSkipped: number
  commitmentsExtracted: number
  duplicatesSkipped: number
  errors: string[]
}

const VALID_CATEGORIES = ['ACADEMIC', 'CAREER', 'PERSONAL', 'FINANCE'] as const
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const MAX_EMAIL_BODY_LENGTH = 10_000
const LLM_BODY_PREVIEW_LENGTH = 1_000
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * EMAIL CLASSIFICATION RULES (rule-based, no AI)
 *
 * Evaluation order: SOCIAL → NEWSLETTER → PROMOTIONAL → ACTIONABLE → INFORMATIONAL
 *
 * SOCIAL — social network activity notifications (not user obligations)
 *   From: linkedin.com, twitter.com, x.com, facebookmail.com, instagram.com
 *   Subject: "just posted", "new connection", "mentioned you", "liked your", "commented on"
 *
 * NEWSLETTER — digests and content subscriptions
 *   Subject: "newsletter", "weekly digest", "daily digest", "recommended for you", "new content"
 *   From: substack.com, mail.beehiiv.com, newsletter@
 *
 * PROMOTIONAL — marketing and sales
 *   Subject: "sale", "discount", "offer", "limited time", "promo", "% off", "free shipping", "shop now"
 *   From: marketing@, promo@, noreply@ combined with promotional subject cues
 *
 * ACTIONABLE — evidence the user must do something
 *   Subject/body: invoice, payment due, deadline, interview, assessment, meeting, verification,
 *   appointment, exam, OTP, confirm your, register by, registration deadline, submit by,
 *   application due, scholarship deadline, follow-up required, action required, due by, due on,
 *   bill payment, verify your account, complete your, RSVP, attend, join us for
 *
 * INFORMATIONAL — default when no actionable signal and not clearly social/news/promo
 */
const SOCIAL_FROM_PATTERNS = [
  /linkedin/i,
  /twitter/i,
  /x\.com/i,
  /facebookmail/i,
  /instagram/i,
  /notifications@quora/i,
] as const

const SOCIAL_SUBJECT_PATTERNS = [
  /just posted/i,
  /new connection/i,
  /mentioned you/i,
  /liked your/i,
  /commented on/i,
  /shared a post/i,
  /invited you to connect/i,
  /is hiring/i,
  /viewed your profile/i,
] as const

const NEWSLETTER_SUBJECT_PATTERNS = [
  /newsletter/i,
  /weekly digest/i,
  /daily digest/i,
  /recommended for you/i,
  /new content/i,
  /top stories/i,
  /your weekly/i,
  /edition #/i,
] as const

const NEWSLETTER_FROM_PATTERNS = [
  /substack/i,
  /beehiiv/i,
  /newsletter@/i,
  /digest@/i,
] as const

const PROMOTIONAL_SUBJECT_PATTERNS = [
  /\bsale\b/i,
  /discount/i,
  /\boffer\b/i,
  /limited time/i,
  /\bpromo/i,
  /% off/i,
  /free shipping/i,
  /shop now/i,
  /exclusive deal/i,
  /don't miss out/i,
  /special offer/i,
  /product launch/i,
  /product announcement/i,
] as const

const PROMOTIONAL_FROM_PATTERNS = [/marketing@/i, /promo@/i, /offers@/i] as const

const ACTIONABLE_SUBJECT_PATTERNS = [
  /invoice/i,
  /payment due/i,
  /\bdeadline\b/i,
  /interview/i,
  /assessment/i,
  /meeting/i,
  /verification/i,
  /appointment/i,
  /\bexam\b/i,
  /\botp\b/i,
  /one[- ]time password/i,
  /confirm your/i,
  /register by/i,
  /registration deadline/i,
  /submit by/i,
  /submission due/i,
  /application due/i,
  /scholarship deadline/i,
  /follow[- ]up required/i,
  /action required/i,
  /due by/i,
  /due on/i,
  /bill payment/i,
  /verify your account/i,
  /complete your/i,
  /\brsvp\b/i,
  /attendance confirmation/i,
  /join us for/i,
  /reminder:/i,
  /due tomorrow/i,
  /due today/i,
  /\binvitation\b/i,
  /\bonboarding\b/i,
  /\bbriefing\b/i,
  /\bmeet\b/i,
  /\bconfirmation\b/i,
  /\bjoin\b.*\bmeet\b/i,
] as const

const ACTIONABLE_BODY_PATTERNS = [
  /please confirm/i,
  /please complete/i,
  /please submit/i,
  /please verify/i,
  /please respond/i,
  /response required/i,
  /by midnight/i,
  /before \d{1,2}(:\d{2})?\s*(am|pm)/i,
  /due (by|on|before)/i,
  /deadline (is|on|by)/i,
  /payment (is )?due/i,
  /your interview/i,
  /your exam/i,
  /verification code/i,
] as const

const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
] as const

function matchesAny(text: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(text))
}

export function classifyEmail(email: EmailData): EmailClassification {
  const subject = email.subject
  const from = email.from
  const bodyPreview = email.body.substring(0, 500)
  const subjectLower = subject.toLowerCase()
  const fromLower = from.toLowerCase()
  const bodyLower = bodyPreview.toLowerCase()

  if (
    matchesAny(fromLower, SOCIAL_FROM_PATTERNS) ||
    matchesAny(subjectLower, SOCIAL_SUBJECT_PATTERNS)
  ) {
    return 'SOCIAL'
  }

  if (
    matchesAny(subjectLower, NEWSLETTER_SUBJECT_PATTERNS) ||
    matchesAny(fromLower, NEWSLETTER_FROM_PATTERNS)
  ) {
    return 'NEWSLETTER'
  }

  if (
    matchesAny(subjectLower, PROMOTIONAL_SUBJECT_PATTERNS) ||
    (matchesAny(fromLower, PROMOTIONAL_FROM_PATTERNS) &&
      matchesAny(subjectLower, PROMOTIONAL_SUBJECT_PATTERNS))
  ) {
    return 'PROMOTIONAL'
  }

  if (
    matchesAny(subjectLower, ACTIONABLE_SUBJECT_PATTERNS) ||
    matchesAny(bodyLower, ACTIONABLE_BODY_PATTERNS)
  ) {
    return 'ACTIONABLE'
  }

  return 'INFORMATIONAL'
}

function parseEmailReferenceDate(dateStr: string): Date {
  const parsed = new Date(dateStr)

  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }

  return parsed
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function nextWeekday(referenceDate: Date, weekdayIndex: number): Date {
  const ref = startOfDay(referenceDate)
  const currentDay = ref.getDay()
  let daysUntil = weekdayIndex - currentDay

  if (daysUntil <= 0) {
    daysUntil += 7
  }

  const result = new Date(ref)
  result.setDate(result.getDate() + daysUntil)
  return result
}

function setTimeFromMatch(
  date: Date,
  hour: number,
  minute: number,
  meridiem: string | undefined,
): Date {
  const result = new Date(date)
  let normalizedHour = hour

  if (meridiem?.toLowerCase() === 'pm' && hour < 12) {
    normalizedHour += 12
  }

  if (meridiem?.toLowerCase() === 'am' && hour === 12) {
    normalizedHour = 0
  }

  result.setHours(normalizedHour, minute, 0, 0)
  return result
}

/**
 * DEADLINE PARSING RULES
 *
 * Supports ISO strings, relative phrases, weekday names, named dates, and time bounds.
 * Uses the email date as reference when available; returns null if uncertain.
 */
export function parseDeadline(
  raw: string | null,
  referenceDate: Date,
): Date | null {
  if (!raw || raw.trim().length === 0) {
    return null
  }

  const trimmed = raw.trim()

  // Pre-process and clean the string
  let cleaned = trimmed
    // Remove day-of-week prefix (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
    .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(s|day|sday|nesday|rsday|iday|urday)?(?:day)?(?:,\s*|\s+)/i, '')
    // Remove time range end-bound " - 11:30pm"
    .replace(/\s*-\s*\d{1,2}:\d{2}\s*(am|pm)/i, '')
    // Insert space before am/pm if missing: "10:30pm" → "10:30 pm"
    .replace(/(\d)\s*(am|pm)/i, '$1 $2')
    .trim()

  // Try parsing fully-formed date/time strings first to avoid losing time details via regex fallbacks
  const parsed = Date.parse(cleaned)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed)
  }

  const lower = cleaned.toLowerCase()
  const ref = startOfDay(referenceDate)

  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    const isoDate = new Date(cleaned)

    if (!Number.isNaN(isoDate.getTime())) {
      return isoDate
    }
  }

  if (lower === 'tomorrow') {
    const tomorrow = new Date(ref)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)
    return tomorrow
  }

  if (lower.includes('next week')) {
    const nextWeek = new Date(ref)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return nextWeek
  }

  for (let index = 0; index < WEEKDAY_NAMES.length; index += 1) {
    if (lower.includes(WEEKDAY_NAMES[index])) {
      return nextWeekday(referenceDate, index)
    }
  }

  const SHORT_MONTH_NAMES = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ]

  const dayMonthYearMatch = lower.match(
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i,
  )

  if (dayMonthYearMatch) {
    const day = Number(dayMonthYearMatch[1])
    let month = MONTH_NAMES.indexOf(dayMonthYearMatch[2].toLowerCase() as (typeof MONTH_NAMES)[number])
    if (month === -1) {
      month = SHORT_MONTH_NAMES.indexOf(dayMonthYearMatch[2].toLowerCase())
    }
    const year = Number(dayMonthYearMatch[3])

    if (month >= 0) {
      const parsed = new Date(year, month, day)

      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
  }

  const monthDayMatch = lower.match(
    /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?/i,
  )

  if (monthDayMatch) {
    let month = MONTH_NAMES.indexOf(monthDayMatch[1].toLowerCase() as (typeof MONTH_NAMES)[number])
    if (month === -1) {
      month = SHORT_MONTH_NAMES.indexOf(monthDayMatch[1].toLowerCase())
    }
    const day = Number(monthDayMatch[2])
    const year = monthDayMatch[3] ? Number(monthDayMatch[3]) : referenceDate.getFullYear()
    const parsed = new Date(year, month, day)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  if (lower.includes('by midnight') || lower.includes('before midnight')) {
    const midnight = new Date(ref)
    midnight.setHours(23, 59, 59, 999)
    return midnight
  }

  const timeMatch = lower.match(/before\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)

  if (timeMatch) {
    const hour = Number(timeMatch[1])
    const minute = timeMatch[2] ? Number(timeMatch[2]) : 0
    const meridiem = timeMatch[3]
    const timed = setTimeFromMatch(ref, hour, minute, meridiem)

    if (timed.getTime() > referenceDate.getTime()) {
      return timed
    }

    return null
  }

  console.error('parseDeadline failed for:', raw, '→ cleaned:', cleaned)
  return null
}

/**
 * PRIORITY ASSIGNMENT RULES
 *
 * CRITICAL — deadline within 24 hours (interviews, exams, payments due today/tomorrow)
 * HIGH     — deadline within 7 days
 * MEDIUM   — action required but no urgent deadline
 * LOW      — optional follow-up with no urgent deadline
 */
export function assignPriority(
  deadline: Date | null,
  now: Date,
  aiPriority: Priority,
): Priority {
  if (deadline) {
    const millisecondsUntil = deadline.getTime() - now.getTime()
    const hoursUntil = millisecondsUntil / (1000 * 60 * 60)
    const daysUntil = millisecondsUntil / (1000 * 60 * 60 * 24)

    if (hoursUntil <= 24) {
      return 'CRITICAL'
    }

    if (daysUntil <= 7) {
      return 'HIGH'
    }

    return 'MEDIUM'
  }

  if (aiPriority === 'LOW') {
    return 'LOW'
  }

  return 'MEDIUM'
}

function compactEmail(email: EmailData) {
  return {
    id: email.id,
    subject: email.subject,
    from: email.from,
    date: email.date,
    body: email.body.substring(0, LLM_BODY_PREVIEW_LENGTH),
  }
}

function parseJsonArray(text: string): RawCommitment[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    const start = cleaned.indexOf('[')
    const end = cleaned.lastIndexOf(']')

    if (start === -1 || end === -1 || end <= start) {
      return []
    }

    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1))

      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}

function normalizeCommitment(
  raw: RawCommitment,
  referenceDate: Date,
): NormalizedCommitment | null {
  if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    return null
  }

  const category =
    typeof raw.category === 'string' &&
    VALID_CATEGORIES.includes(raw.category as Category)
      ? (raw.category as Category)
      : 'PERSONAL'

  const aiPriority =
    typeof raw.priority === 'string' &&
    VALID_PRIORITIES.includes(raw.priority as Priority)
      ? (raw.priority as Priority)
      : 'MEDIUM'

  const rawDeadline =
    typeof raw.deadline === 'string' && raw.deadline.trim().length > 0
      ? raw.deadline
      : null

  const deadline = parseDeadline(rawDeadline, referenceDate)
  const priority = assignPriority(deadline, new Date(), aiPriority)

  return {
    title: raw.title.trim(),
    description:
      typeof raw.description === 'string' &&
      raw.description.trim().length > 0
        ? raw.description.trim()
        : null,
    category,
    priority,
    deadline,
    sourceEmailSubject:
      typeof raw.sourceEmailSubject === 'string' &&
      raw.sourceEmailSubject.trim().length > 0
        ? raw.sourceEmailSubject.trim()
        : null,
  }
}

function buildExtractionPrompt(emails: EmailData[]) {
  return `You extract REAL commitments from Gmail messages. Be strict. When in doubt, return [].

Only extract a commitment when at least ONE is true:
1. A specific user action is required (submit, pay, verify, attend, respond, register, complete)
2. A deadline or due date exists
3. A response or follow-up is explicitly expected

If NONE of the above apply, return [].

POSITIVE examples (extract):
- "Interview scheduled for Friday at 2 PM — please confirm attendance" → extract interview commitment with deadline
- "Assignment 3 is due tomorrow by midnight" → extract assignment submission with deadline
- "Your electricity bill of $120 is due on 25 June 2026" → extract bill payment with deadline
- "Please verify your account within 24 hours using this OTP" → extract account verification
- "RSVP required for campus recruitment event on June 25" → extract event attendance

NEGATIVE examples (return []):
- "Anshul Bhathija just posted new content" → []
- "Recommended articles for you this week" → []
- "50% off sale this weekend only" → []
- "Your weekly newsletter is here" → []
- "Someone viewed your LinkedIn profile" → []
- "New features announced in our product update" → []

Return ONLY a valid JSON array with no markdown, no backticks, and no explanation.

Each item must have exactly these fields:
{
  "title": "short actionable title",
  "description": "brief context",
  "category": "ACADEMIC | CAREER | PERSONAL | FINANCE",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL",
  "deadline": "natural language or ISO date string, or null if none",
  "sourceEmailSubject": "the subject of the source email"
}

Emails:
${JSON.stringify(emails.map(compactEmail), null, 2)}`
}

async function callLLM(emails: EmailData[]) {
  const apiKey = process.env.GROQ_API_KEY
  const endpoint = GROQ_ENDPOINT
  const keyPrefix = apiKey?.slice(0, 12) ?? null

            
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const skippedEmails = emails.filter(
    (email) => email.body.length > MAX_EMAIL_BODY_LENGTH,
  )
  const processableEmails = emails.filter(
    (email) => email.body.length <= MAX_EMAIL_BODY_LENGTH,
  )

  
  if (processableEmails.length === 0) {
        return []
  }

  const prompt = buildExtractionPrompt(processableEmails)

  const requestBody = JSON.stringify({
    model: GROQ_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0,
  })

      
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: requestBody,
  })

  
  if (!response.ok) {
    throw new Error(
      `Groq API request failed: ${response.status} ${await response.text()}`,
    )
  }

  const data = (await response.json()) as LLMResponse

  const text = data.choices?.[0]?.message?.content ?? ''

      
  return parseJsonArray(text)
}

async function isDuplicateCommitment(
  userId: string,
  title: string,
  deadline: Date | null,
): Promise<boolean> {
  const existing = await prisma.commitment.findFirst({
    where: {
      userId,
      title,
      deadline,
    },
  })

  return Boolean(existing)
}

async function saveCommitment(
  userId: string,
  commitment: NormalizedCommitment,
  summary: ExtractionSummary,
): Promise<void> {
  const duplicate = await isDuplicateCommitment(
    userId,
    commitment.title,
    commitment.deadline,
  )

  if (duplicate) {
        summary.duplicatesSkipped += 1
    return
  }

  const { riskScore, newStatus } = calculateRiskScore(
    commitment.deadline,
    'DISCOVERED' as CommitmentStatus,
  )

  const commitmentData = {
    userId,
    title: commitment.title,
    description: commitment.description,
    category: commitment.category,
    priority: commitment.priority,
    deadline: commitment.deadline,
    status: newStatus,
    riskScore,
  }

  
  const createdCommitment = await prisma.commitment.create({
    data: commitmentData,
  })

    
  await prisma.commitmentSource.create({
    data: {
      commitmentId: createdCommitment.id,
      sourceType: 'GMAIL',
      sourceReference: commitment.sourceEmailSubject,
    },
  })

  summary.commitmentsExtracted += 1
}

export async function extractCommitments(
  emails: EmailData[],
  userId: string,
): Promise<ExtractionSummary> {
  const summary: ExtractionSummary = {
    emailsProcessed: emails.length,
    emailsSkipped: 0,
    commitmentsExtracted: 0,
    duplicatesSkipped: 0,
    errors: [],
  }

  
  if (emails.length === 0) {
        return summary
  }

  const actionableEmails: EmailData[] = []

  for (const email of emails) {
    const classification = classifyEmail(email)

    
    if (email.body.length > MAX_EMAIL_BODY_LENGTH) {
            summary.emailsSkipped += 1
      continue
    }

    if (classification !== 'ACTIONABLE') {
            summary.emailsSkipped += 1
      continue
    }

    actionableEmails.push(email)
  }

  for (const email of actionableEmails) {
    try {
      const referenceDate = parseEmailReferenceDate(email.date)
      const rawCommitments = await callLLM([email])

      
      const commitments = rawCommitments
        .map((raw) => normalizeCommitment(raw, referenceDate))
        .filter(
          (commitment): commitment is NormalizedCommitment =>
            Boolean(commitment),
        )

      
      for (const commitment of commitments) {
        await saveCommitment(userId, commitment, summary)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      console.error('EXTRACTION ERROR:', {
        Subject: email.subject,
        Error: message,
      })
      summary.errors.push(`${email.subject}: ${message}`)
    }
  }

  
  return summary
}
