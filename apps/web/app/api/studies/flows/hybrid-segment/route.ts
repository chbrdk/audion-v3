import { NextResponse } from 'next/server'
import type { UxFlowHybridSegmentPayload } from '@audion-v3/contracts'
import { startHybridFlowSegment } from '../../../../../lib/ux-flow-hybrid'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UxFlowHybridSegmentPayload
    const result = await startHybridFlowSegment(body)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = /not configured/i.test(message)
      ? 503
      : /required|not agent-runnable|Could not compile|Flow /i.test(message)
        ? 400
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
