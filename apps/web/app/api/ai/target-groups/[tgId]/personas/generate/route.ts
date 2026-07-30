import { NextResponse } from 'next/server'
import type { GeneratePersonasRequest } from '@audion-v3/contracts'
import { runStubGeneratePersonas, withAiLiveOrStub } from '../../../../../../../lib/ai-workflows'
import { runLiveGeneratePersonas } from '../../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ tgId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { tgId } = await params
  const body = (await request.json().catch(() => ({}))) as GeneratePersonasRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveGeneratePersonas(tgId, body, authorization),
    () => runStubGeneratePersonas(tgId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data, { status: 201 })
}
