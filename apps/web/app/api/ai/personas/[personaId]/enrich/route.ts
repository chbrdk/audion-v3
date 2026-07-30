import { NextResponse } from 'next/server'
import type { EnrichPersonaRequest } from '@audion-v3/contracts'
import { runStubEnrichPersona, withAiNativeOrStub } from '../../../../../../lib/ai-workflows'
import { runNativeEnrichPersona } from '../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as EnrichPersonaRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeEnrichPersona(personaId, body, authorization),
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
