import { NextResponse } from 'next/server'
import type { GeneratePersonaAvatarRequest } from '@audion-v3/contracts'
import { runStubGeneratePersonaAvatar, withAiNativeOrStub } from '../../../../../../../lib/ai-workflows'
import { runNativeGeneratePersonaAvatar } from '../../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as GeneratePersonaAvatarRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeGeneratePersonaAvatar(personaId, body, authorization),
    () => runStubGeneratePersonaAvatar(personaId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
