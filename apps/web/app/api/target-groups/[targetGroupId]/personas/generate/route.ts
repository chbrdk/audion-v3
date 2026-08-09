/**
 * PLEXON / FastAPI-shaped path (no `/ai` prefix).
 * Same handler as `POST /api/ai/target-groups/[tgId]/personas/generate`.
 */
import { NextResponse } from 'next/server'
import type { GeneratePersonasRequest } from '@audion-v3/contracts'
import { runStubGeneratePersonas, withAiNativeOrStub } from '../../../../../../lib/ai-workflows'
import { runNativeGeneratePersonas } from '../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ targetGroupId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { targetGroupId } = await params
  const body = (await request.json().catch(() => ({}))) as GeneratePersonasRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeGeneratePersonas(targetGroupId, body, authorization),
    () => runStubGeneratePersonas(targetGroupId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data, { status: 201 })
}
