import { NextResponse } from 'next/server'
import type { ChatTavusSessionResponse } from '@audion-v3/contracts'
import { fetchPersonaApi, shouldPreferAiLive, shouldRequireAiLive } from '../../../../../lib/persona-api-proxy'
import { paths } from '../../../../../lib/paths'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { personaId?: string } | null
  const personaId = body?.personaId?.trim()
  if (!personaId) {
    return NextResponse.json({ error: 'personaId required' }, { status: 400 })
  }

  if (shouldPreferAiLive()) {
    const authorization = request.headers.get('authorization')
    const live = await fetchPersonaApi(paths.routes.upstreamPersonaAdminTavusSession, {
      method: 'POST',
      body: { persona_id: personaId },
      authorization,
    })
    if (live.ok) {
      const json = (live.json ?? {}) as Record<string, unknown>
      const response: ChatTavusSessionResponse = {
        stubbed: false,
        conversationUrl: String(json.conversation_url ?? json.conversationUrl ?? ''),
        meetingToken: (json.meeting_token as string) ?? (json.meetingToken as string) ?? null,
        personaId,
      }
      return NextResponse.json(response)
    }
    if (shouldRequireAiLive()) {
      return NextResponse.json(
        { error: live.error, detail: live.detail },
        { status: live.status },
      )
    }
  }

  const stub: ChatTavusSessionResponse = {
    stubbed: true,
    conversationUrl: `https://tavus.example/stub/${encodeURIComponent(personaId)}`,
    meetingToken: null,
    personaId,
  }
  return NextResponse.json(stub)
}
