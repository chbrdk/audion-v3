import { NextResponse } from 'next/server'
import type { GeneratePersonaAvatarRequest } from '@audion-v3/contracts'
import { runStubGeneratePersonaAvatar } from '../../../../../../../lib/ai-workflows'

type Params = { params: Promise<{ personaId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { personaId } = await params
  const body = (await request.json().catch(() => ({}))) as GeneratePersonaAvatarRequest
  const result = runStubGeneratePersonaAvatar(personaId, body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result, { status: 200 })
}
