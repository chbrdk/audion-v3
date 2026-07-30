import { NextResponse } from 'next/server'
import type { SuggestPersonasRequest } from '@audion-v3/contracts'
import { runStubSuggestPersonas, withAiNativeOrStub } from '../../../../../../lib/ai-workflows'
import { runNativeSuggestPersonas } from '../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as SuggestPersonasRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeSuggestPersonas(projectId, body, authorization),
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
