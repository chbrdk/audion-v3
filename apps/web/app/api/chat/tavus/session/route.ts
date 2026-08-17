import { NextResponse } from 'next/server'
import type { ChatTavusSessionResponse } from '@audion-v3/contracts'
import { storePersonaDetail } from '../../../../../lib/fixtures/persona-store'
import {
  createTavusConversation,
  endTavusConversation,
  tavusConversationName,
  TavusApiError,
} from '../../../../../lib/tavus/client'
import { personaTavusIds } from '../../../../../lib/tavus/ids'
import { tavusSessionConversationalContext } from '../../../../../lib/tavus/prompt'
import { syncPersonaTavusPal } from '../../../../../lib/tavus/sync'

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

  const synced = await syncPersonaTavusPal(persona)
  const working = synced.persona
  const { replicaId, palId } = personaTavusIds(working)
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

  try {
    const session = await createTavusConversation({
      replicaId,
      palId,
      conversationName: tavusConversationName(working.name),
      conversationalContext: tavusSessionConversationalContext(working.name),
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

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as { conversationId?: string } | null
  const conversationId = body?.conversationId?.trim()
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
  }
  try {
    await endTavusConversation(conversationId)
    return NextResponse.json({ ok: true, conversationId })
  } catch (error) {
    if (error instanceof TavusApiError) {
      return NextResponse.json(
        { error: error.message, detail: error.detail },
        { status: error.status },
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tavus end failed' },
      { status: 502 },
    )
  }
}
