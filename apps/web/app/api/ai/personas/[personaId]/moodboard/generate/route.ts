import { NextResponse } from 'next/server'
import type { GenerateMoodboardRequest } from '@audion-v3/contracts'
import { runStubGenerateMoodboard, withAiLiveOrStub } from '../../../../../../../lib/ai-workflows'
import { runLiveGenerateMoodboard } from '../../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as GenerateMoodboardRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveGenerateMoodboard(personaId, body, authorization),
    () => runStubGenerateMoodboard(personaId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data, { status: 201 })
}
