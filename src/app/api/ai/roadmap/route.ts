import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch all active commitments (not archived or deleted)
    const commitments = await prisma.commitment.findMany({
      where: {
        userId,
        status: {
          not: 'ARCHIVED',
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        estimatedEffort: true,
        priority: true,
        status: true,
        riskScore: true,
      },
      orderBy: {
        deadline: 'asc',
      },
    })

    // Fetch all active context memories (not deleted)
    const contexts = await prisma.contextMemory.findMany({
      where: {
        userId,
        deleted: false,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        contextName: true,
        nextAction: true,
        estimatedTime: true,
        priority: true,
        lastCheckpoint: true,
      },
      orderBy: {
        priority: 'desc',
      },
    })

    // Build prompt
    const commitmentsText = commitments
      .map(
        (c) =>
          `- ${c.title} (Priority: ${c.priority}, Deadline: ${c.deadline ? new Date(c.deadline).toLocaleDateString() : 'None'}, Estimated: ${c.estimatedEffort || 'Unknown'} min, Risk: ${c.riskScore}/100, Status: ${c.status})`
      )
      .join('\n')

    const contextsText = contexts
      .map(
        (ctx) =>
          `- ${ctx.contextName} (Next: ${ctx.nextAction || 'Not set'}, Estimated: ${ctx.estimatedTime || 'Unknown'} min, Priority: ${ctx.priority})`
      )
      .join('\n')

    const prompt = `You are a personal productivity advisor. Analyze ALL of the user's current commitments and active work contexts below.

Your job:
1. Create a priority-ordered list of what the user should work on
2. For each item give a specific actionable suggestion
3. Identify if the user is overloaded (more than 40 hours of work in the next 7 days)
4. If overloaded, identify which commitments should be postponed or dropped, with a specific friendly reason
5. Create a day-by-day roadmap for the next 7 days

Commitments:
${commitmentsText || 'No commitments'}

Active Contexts:
${contextsText || 'No active contexts'}

Return ONLY valid JSON with this exact structure:
{
  "overloaded": boolean,
  "overloadMessage": string or null (friendly message if overloaded, null if not),
  "postponeSuggestions": [
    {
      "commitmentId": string,
      "commitmentTitle": string,
      "reason": string,
      "suggestion": string
    }
  ],
  "priorityList": [
    {
      "id": string,
      "type": "commitment" or "context",
      "title": string,
      "action": string,
      "estimatedTime": number,
      "urgency": "today" or "this-week" or "later"
    }
  ],
  "roadmap": [
    {
      "day": string,
      "tasks": [
        {
          "title": string,
          "duration": number,
          "type": "commitment" or "context"
        }
      ]
    }
  ],
  "generalAdvice": string
}`

    // Call Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000,
    })

    const responseText = completion.choices[0]?.message?.content || '{}'

    // Parse JSON response
    let result
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
      const jsonText = jsonMatch ? jsonMatch[1] : responseText
      result = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse Groq response:', responseText)
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate result structure
    if (!result.priorityList || !result.roadmap) {
      console.error('Invalid response structure:', result)
      return NextResponse.json(
        { error: 'Invalid AI response structure' },
        { status: 500 }
      )
    }

    // Save to RoadmapCache (upsert)
    await prisma.roadmapCache.upsert({
      where: { userId },
      update: {
        result,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        result,
        generatedAt: new Date(),
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating roadmap:', error)
    return NextResponse.json(
      { error: 'Failed to generate roadmap' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Fetch cached roadmap
    const cache = await prisma.roadmapCache.findUnique({
      where: { userId },
    })

    if (!cache) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({
      exists: true,
      data: cache.result,
      generatedAt: cache.generatedAt,
    })
  } catch (error) {
    console.error('Error fetching roadmap:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roadmap' },
      { status: 500 }
    )
  }
}
