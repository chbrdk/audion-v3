import { NextResponse } from 'next/server'
import type { UxStudyFromFlowPayload } from '@audion-v3/contracts'
import {
  createStudyFromUxTestFlow,
  listUxTestFlows,
} from '../../../../lib/ux-test-flows'
import { shouldProxyUxStudiesToApi } from '../../../../lib/ux-studies-proxy'

export async function GET() {
  return NextResponse.json({ items: listUxTestFlows() })
}

export async function POST(request: Request) {
  if (shouldProxyUxStudiesToApi()) {
    return NextResponse.json(
      { error: 'from-flow is fixture/native only (not proxied to v2)' },
      { status: 501 },
    )
  }
  const body = (await request.json()) as UxStudyFromFlowPayload
  if (!body?.flowId?.trim()) {
    return NextResponse.json({ error: 'flowId is required' }, { status: 400 })
  }
  try {
    const result = await createStudyFromUxTestFlow(body)
    if (!result) {
      return NextResponse.json({ error: 'Unknown flowId' }, { status: 404 })
    }
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
