import { NextResponse } from 'next/server'
import type { SuggestPersonasRequest } from '@audion-v3/contracts'
import { runStubSuggestPersonas, withAiLiveOrStub } from '../../../../../../lib/ai-workflows'
import { runLiveSuggestPersonas } from '../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestPersonasRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveSuggestPersonas(projectId, body, authorization),
    () => runStubSuggestPersonas(projectId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
