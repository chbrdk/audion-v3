import { Alert } from '@msqdx/ui'
import { AudionChatWorkspace } from '../../components/audion-chat-workspace'
import { AppShell } from '../../components/app-shell'
import { buildChatPrefillDraft } from '../../lib/chat/prefill'
import { fetchSharePersona } from '../../lib/chat/share-persona'
import { fetchChatConversationDetail } from '../../lib/chat/conversations'
import { storeShareMoodboard } from '../../lib/fixtures/chat-share'
import { fetchPersonaList } from '../../lib/personas'
import { fetchProjectList } from '../../lib/projects'
import { fetchTargetGroupDetail, fetchTargetGroupList } from '../../lib/target-groups'
import type { ChatMode, PersonaSummary } from '@audion-v3/contracts'

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
    targetGroupId?: string
  }>
}) {
  const params = (await searchParams) || {}
  const personaId = typeof params.personaId === 'string' ? params.personaId : null
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : null
  const projectId = typeof params.projectId === 'string' ? params.projectId : null
  const targetGroupId =
    typeof params.targetGroupId === 'string' ? params.targetGroupId : null
  const prompt = typeof params.prompt === 'string' ? params.prompt : ''
  const studyName = typeof params.studyName === 'string' ? params.studyName : null
  const waveKey = typeof params.waveKey === 'string' ? params.waveKey : null
  const initialDraft = prompt
    ? buildChatPrefillDraft({ prompt, studyName, waveKey })
    : null
  const shareMode = Boolean(projectId && personaId)
  /** Project ask-all: projectId alone (share uses personaId + projectId). */
  const projectAskAll = Boolean(projectId && !personaId && !targetGroupId)

  try {
    if (shareMode && personaId && projectId) {
      const shared = await fetchSharePersona(personaId, projectId)
      if ('error' in shared) {
        return (
          <AppShell>
            <Alert tone="error">{shared.error}</Alert>
          </AppShell>
        )
      }
      const mood = storeShareMoodboard(personaId, projectId)
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
        <AudionChatWorkspace
          personas={personas}
          initialPersonaId={shared.id}
          initialConversation={null}
          initialDraft={initialDraft}
          shareProjectId={projectId}
          moodboardTiles={'error' in mood ? undefined : mood.tiles}
        />
      )
    }

    const [personaResult, conversation, tgList, tgDetail, projectResult] = await Promise.all([
      fetchPersonaList(),
      conversationId ? fetchChatConversationDetail(conversationId) : Promise.resolve(null),
      fetchTargetGroupList(),
      targetGroupId
        ? fetchTargetGroupDetail(targetGroupId).then((r) => r.targetGroup)
        : Promise.resolve(null),
      fetchProjectList(),
    ])

    let initialMode: ChatMode = 'persona'
    if (targetGroupId) initialMode = 'target_group'
    else if (projectAskAll) initialMode = 'project'

    return (
      <AudionChatWorkspace
        personas={personaResult.items}
        initialPersonaId={personaId || conversation?.personaId || null}
        initialConversation={conversation}
        initialDraft={initialDraft}
        shareProjectId={null}
        targetGroups={tgList.items}
        initialTargetGroup={tgDetail}
        projects={projectResult.items}
        initialProjectId={projectAskAll ? projectId : null}
        initialMode={initialMode}
      />
    )
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Chat unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
