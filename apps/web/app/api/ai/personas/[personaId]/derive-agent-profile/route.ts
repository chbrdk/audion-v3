import { NextResponse } from 'next/server'
import type { DerivePersonaAgentProfileRequest } from '@audion-v3/contracts'
import { runStubDerivePersonaAgentProfile, withAiNativeOrStub } from '../../../../../../lib/ai-workflows'
import { runNativeDerivePersonaAgentProfile } from '../../../../../../lib/ai-workflows-native'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as DerivePersonaAgentProfileRequest
  const resolved = await withAiNativeOrStub(
    request,
    (authorization) => runNativeDerivePersonaAgentProfile(personaId, body, authorization),
    () => runStubDerivePersonaAgentProfile(personaId, body),
  )
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, detail: resolved.detail },
      { status: resolved.status },
    )
  }
  return NextResponse.json(resolved.data)
}
