import { NextResponse } from 'next/server'
import type { GenerateMoodboardRequest } from '@audion-v3/contracts'
import { runStubGenerateMoodboard, withAiNativeOrStub } from '../../../../../../../lib/ai-workflows'
import { runNativeGenerateMoodboard } from '../../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as GenerateMoodboardRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeGenerateMoodboard(personaId, body, authorization),
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
