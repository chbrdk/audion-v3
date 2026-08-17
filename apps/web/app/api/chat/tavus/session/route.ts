import { NextResponse } from 'next/server'
import type { ChatTavusSessionResponse } from '@audion-v3/contracts'
import { storePersonaDetail } from '../../../../../lib/fixtures/persona-store'
import { createTavusConversation, TavusApiError } from '../../../../../lib/tavus/client'
import { personaTavusIds } from '../../../../../lib/tavus/ids'

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

  const { replicaId, palId } = personaTavusIds(persona)
  if (!replicaId && !palId) {
    return NextResponse.json(
      {
        error: 'Persona has no Tavus replica ID. Add one on the persona profile.',
        code: 'TAVUS_REPLICA_MISSING',
        personaId,
      },
      { status: 400 },
    )
  }

  const contextParts = [persona.name, persona.role, persona.bio].filter(
    (part): part is string => Boolean(part && part.trim()),
  )

  try {
    const session = await createTavusConversation({
      replicaId,
      palId,
      conversationName: `AUDION · ${persona.name}`,
      conversationalContext: contextParts.join(' — '),
    })
    const response: ChatTavusSessionResponse = {
      stubbed: false,
      conversationUrl: session.conversationUrl,
      meetingToken: session.meetingToken,
      conversationId: session.conversationId,
      personaId,
    }
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof TavusApiError) {
      return NextResponse.json(
        { error: error.message, detail: error.detail },
        { status: error.status },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tavus session failed' },
      { status: 502 },
    )
  }
}
