import { Alert } from '@msqdx/ui'
import { AudionChatWorkspace } from '../../components/audion-chat-workspace'
import { AppShell } from '../../components/app-shell'
import { buildChatPrefillDraft } from '../../lib/chat/prefill'
import { fetchChatConversationDetail } from '../../lib/chat/conversations'
import { fetchPersonaList } from '../../lib/personas'

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: Promise<{
    personaId?: string
    conversationId?: string
    prompt?: string
    studyId?: string
    waveId?: string
    projectId?: string
    studyName?: string
    waveKey?: string
  }>
}) {
  const params = (await searchParams) || {}
  const personaId = typeof params.personaId === 'string' ? params.personaId : null
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : null
  const prompt = typeof params.prompt === 'string' ? params.prompt : ''
  const studyName = typeof params.studyName === 'string' ? params.studyName : null
  const waveKey = typeof params.waveKey === 'string' ? params.waveKey : null
  const initialDraft = prompt
    ? buildChatPrefillDraft({ prompt, studyName, waveKey })
    : null

  try {
    const [personaResult, conversation] = await Promise.all([
      fetchPersonaList(),
      Promise.resolve(conversationId ? fetchChatConversationDetail(conversationId) : null),
    ])
    return (
      <AudionChatWorkspace
        personas={personaResult.items}
        initialPersonaId={personaId || conversation?.personaId || null}
        initialConversation={conversation}
        initialDraft={initialDraft}
      />
    )
  } catch (error) {
    return (
      <AppShell title="Chat">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Chat unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
