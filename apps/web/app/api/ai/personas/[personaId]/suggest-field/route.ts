import { NextResponse } from 'next/server'
import type { SuggestPersonaFieldRequest } from '@audion-v3/contracts'
import { runStubSuggestPersonaField, withAiLiveOrStub } from '../../../../../../lib/ai-workflows'
import { runLiveSuggestPersonaField } from '../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestPersonaFieldRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveSuggestPersonaField(personaId, body, authorization),
    () => runStubSuggestPersonaField(personaId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
