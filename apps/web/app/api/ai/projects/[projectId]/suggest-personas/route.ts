import { NextResponse } from 'next/server'
import type { SuggestPersonasRequest } from '@audion-v3/contracts'
import { runStubSuggestPersonas } from '../../../../../../lib/ai-workflows'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestPersonasRequest
  if (!body?.target_group_id?.trim()) {
    return NextResponse.json({ error: 'target_group_id is required' }, { status: 400 })
  }
  const result = runStubSuggestPersonas(projectId, body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
