import { NextResponse } from 'next/server'
import type { ResearchStartRequest } from '@audion-v3/contracts'
import { runStubResearchStart } from '../../../../../../../lib/ai-workflows'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as ResearchStartRequest
  const result = runStubResearchStart(projectId, body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result, { status: 202 })
}
