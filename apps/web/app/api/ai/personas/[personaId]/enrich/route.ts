import { NextResponse } from 'next/server'
import type { EnrichPersonaRequest } from '@audion-v3/contracts'
import { runStubEnrichPersona, withAiLiveOrStub } from '../../../../../../lib/ai-workflows'
import { runLiveEnrichPersona } from '../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as EnrichPersonaRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveEnrichPersona(personaId, body, authorization),
    () => runStubEnrichPersona(personaId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
