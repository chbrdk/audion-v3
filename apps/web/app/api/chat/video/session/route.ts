import { NextResponse } from 'next/server'
import { storePersonaDetail } from '../../../../../lib/fixtures/persona-store'
import {
  createVideoSessionForPersona,
  endVideoSession,
} from '../../../../../lib/video-call/session'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { personaId?: string } | null
  const personaId = body?.personaId?.trim()
  if (!personaId) {
    return NextResponse.json({ error: 'personaId required' }, { status: 400 })
  }

  const persona = await storePersonaDetail(personaId)
  if (!persona) {
    return NextResponse.json(
      { error: 'Persona not found', code: 'PERSONA_NOT_FOUND', personaId },
      { status: 404 },
    )
  }

  const result = await createVideoSessionForPersona(persona)
  if ('error' in result) {
    return NextResponse.json(
      {
        error: result.error,
        code: result.code,
        detail: result.detail,
        personaId: result.personaId,
      },
      { status: result.status },
    )
  }
  return NextResponse.json(result)
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    conversationId?: string
    provider?: 'tavus' | 'bey'
  } | null
  const conversationId = body?.conversationId?.trim()
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
  }
  const result = await endVideoSession({
    conversationId,
    provider: body?.provider,
  })
  if ('error' in result) {
    return NextResponse.json(
      { error: result.error, detail: result.detail, code: result.code },
      { status: result.status },
    )
  }
  return NextResponse.json(result)
}
