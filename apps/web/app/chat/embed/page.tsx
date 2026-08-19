import { Alert } from '@msqdx/ui'
import { cookies } from 'next/headers'
import { AudionChatWorkspace } from '../../../components/audion-chat-workspace'
import {
  GUEST_CHAT_COOKIE,
  GUEST_CHAT_MAX_CHARS,
  GUEST_CHAT_MAX_USER_TURNS,
  createGuestSessionId,
  getGuestBudgetState,
  guestBudgetKey,
  remainingGuestTurns,
} from '../../../lib/chat/guest-budget'
import { fetchSharePersona } from '../../../lib/chat/share-persona'
import type { PersonaSummary } from '@audion-v3/contracts'

export default async function ChatEmbedPage({
  searchParams,
}: {
  searchParams?: Promise<{
    personaId?: string
    projectId?: string
    theme?: string
    embed?: string
  }>
}) {
  const params = (await searchParams) || {}
  const personaId = typeof params.personaId === 'string' ? params.personaId.trim() : ''
  const projectId = typeof params.projectId === 'string' ? params.projectId.trim() : ''
  const theme = typeof params.theme === 'string' ? params.theme.trim() : ''

  if (!personaId || !projectId) {
    return (
      <div className="audion-chat-embed" data-testid="audion-chat-embed" data-theme={theme || undefined}>
        <Alert tone="error">personaId and projectId are required for embedded chat.</Alert>
      </div>
    )
  }

  const shared = await fetchSharePersona(personaId, projectId)
  if ('error' in shared) {
    return (
      <div className="audion-chat-embed" data-testid="audion-chat-embed" data-theme={theme || undefined}>
        <Alert tone="error">{shared.error}</Alert>
      </div>
    )
  }

  const jar = await cookies()
  const sessionId = jar.get(GUEST_CHAT_COOKIE)?.value?.trim() || createGuestSessionId()
  const budget = getGuestBudgetState(guestBudgetKey(sessionId, personaId, projectId))
  const remaining = remainingGuestTurns(budget)

  const personas: PersonaSummary[] = [
    {
      id: shared.id,
      name: shared.name,
      role: shared.role,
      projectId: shared.projectId,
      status: 'ready',
      archetype: null,
      updatedAt: null,
      avatarUrl: shared.avatarUrl,
    },
  ]

  return (
    <div
      className="audion-chat-embed"
      data-testid="audion-chat-embed"
      data-theme={theme || undefined}
      data-guest-remaining={remaining}
      data-guest-max={GUEST_CHAT_MAX_USER_TURNS}
    >
      <AudionChatWorkspace
        personas={personas}
        initialPersonaId={shared.id}
        initialConversation={null}
        shareProjectId={projectId}
        presentation="embed"
        guestBudget={{
          sessionId,
          remainingTurns: remaining,
          maxTurns: GUEST_CHAT_MAX_USER_TURNS,
          maxChars: GUEST_CHAT_MAX_CHARS,
        }}
      />
    </div>
  )
}
