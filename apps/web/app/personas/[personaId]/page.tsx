import { notFound, redirect } from 'next/navigation'
import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { AssistantPageContextPublisher } from '../../../components/assistant-page-context'
import { PersonaDetailPanel } from '../../../components/persona-detail-panel'
import { ASSISTANT_ENTITY_PERSONA } from '../../../lib/assistant-page-context'
import { entityRouteKey } from '../../../lib/entity-slug'
import { fetchPersonaDetail } from '../../../lib/personas'
import { fetchProjectDetail } from '../../../lib/projects'
import { paths } from '../../../lib/paths'

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ personaId: string }>
}) {
  const { personaId } = await params
  let detailResult: Awaited<ReturnType<typeof fetchPersonaDetail>>
  try {
    detailResult = await fetchPersonaDetail(personaId)
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">{error instanceof Error ? error.message : 'Persona backend unavailable.'}</Alert>
      </AppShell>
    )
  }
  if (!detailResult.persona) notFound()
  const canonical = entityRouteKey(detailResult.persona)
  if (canonical !== personaId) {
    redirect(paths.routes.personaDetail(canonical))
  }

  let platformProjectId: string | null = null
  if (detailResult.persona.projectId) {
    try {
      const projectResult = await fetchProjectDetail(detailResult.persona.projectId)
      platformProjectId = projectResult.project?.platformProjectId ?? null
    } catch {
      platformProjectId = null
    }
  }

  return (
    <AppShell>
      <AssistantPageContextPublisher
        platformProjectId={platformProjectId}
        entityType={ASSISTANT_ENTITY_PERSONA}
        entityId={detailResult.persona.id}
      />
      <PersonaDetailPanel persona={detailResult.persona} />
    </AppShell>
  )
}
