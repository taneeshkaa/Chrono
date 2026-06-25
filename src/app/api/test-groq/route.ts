const GROQ_MODEL = 'llama-3.3-70b-versatile'
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY
  const keyPrefix = apiKey?.slice(0, 12) ?? null

  console.log('ENV GROQ EXISTS:', !!process.env.GROQ_API_KEY)
  console.log('TEST KEY PREFIX:', keyPrefix)
  console.log('TEST MODEL:', GROQ_MODEL)
  console.log('GROQ ENDPOINT:', GROQ_ENDPOINT)

  if (!apiKey) {
    return Response.json(
      {
        status: 500,
        keyPrefix,
        model: GROQ_MODEL,
        success: false,
        error: 'GROQ_API_KEY is not configured',
      },
      { status: 500 },
    )
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: 'Say hello',
        },
      ],
      temperature: 0,
    }),
  })

  const responseBody = await response.text()

  console.log('LLM API STATUS:', response.status)
  console.log('LLM RESPONSE BODY:', responseBody)

  return Response.json({
    status: response.status,
    keyPrefix,
    model: GROQ_MODEL,
    success: response.ok,
    body: responseBody,
  })
}
