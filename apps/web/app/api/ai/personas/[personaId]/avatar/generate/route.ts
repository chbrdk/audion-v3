import { NextResponse } from 'next/server'
import type { GeneratePersonaAvatarRequest } from '@audion-v3/contracts'
import { runStubGeneratePersonaAvatar, withAiLiveOrStub } from '../../../../../../../lib/ai-workflows'
import { runLiveGeneratePersonaAvatar } from '../../../../../../../lib/ai-workflows-live'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as GeneratePersonaAvatarRequest
  const resolved = await withAiLiveOrStub(
    request,
    (authorization) => runLiveGeneratePersonaAvatar(personaId, body, authorization),
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
