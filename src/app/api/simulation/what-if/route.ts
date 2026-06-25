import { auth } from '@/auth'
import {
  runSimulation,
  WhatIfSimulationError,
} from '@/lib/what-if'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'
import type { SimulationAction, WhatIfSimulationRequest } from '@/types/simulation'

const VALID_ACTIONS: SimulationAction[] = ['COMPLETE', 'IGNORE', 'ADD']

function isRequestObject(payload: unknown): payload is Record<string, unknown> {
  return typeof payload === 'object' && payload !== null
}

function parseWhatIfRequest(payload: unknown): WhatIfSimulationRequest | null {
  if (!isRequestObject(payload)) return null

  const action = payload.action
  if (typeof action !== 'string' || !VALID_ACTIONS.includes(action as SimulationAction)) {
    return null
  }

  return payload as unknown as WhatIfSimulationRequest
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const whatIfRequest = parseWhatIfRequest(payload)

    if (!whatIfRequest) {
      return NextResponse.json({ error: 'Invalid what-if simulation payload' }, { status: 400 })
    }

    const result = await runSimulation(session.user.id, whatIfRequest)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof WhatIfSimulationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    logger.error('What-if simulation endpoint failed', { userId: session.user.id, error })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
