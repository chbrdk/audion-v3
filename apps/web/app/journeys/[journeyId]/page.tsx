import { notFound } from 'next/navigation'
import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { AssistantPageContextPublisher } from '../../../components/assistant-page-context'
import { JourneyDetailPanel } from '../../../components/journey-detail-panel'
import { ASSISTANT_ENTITY_JOURNEY } from '../../../lib/assistant-page-context'
import { fetchJourneyDetail } from '../../../lib/journeys'
import { fetchProjectDetail } from '../../../lib/projects'

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ journeyId: string }>
}) {
  const { journeyId } = await params
  try {
    const result = await fetchJourneyDetail(journeyId)
    if (!result.journey) notFound()

    let platformProjectId: string | null = null
    if (result.journey.projectId) {
      try {
        const projectResult = await fetchProjectDetail(result.journey.projectId)
        platformProjectId = projectResult.project?.platformProjectId ?? null
      } catch {
        platformProjectId = null
      }
    }

    return (
      <AppShell>
        <AssistantPageContextPublisher
          platformProjectId={platformProjectId}
          entityType={ASSISTANT_ENTITY_JOURNEY}
          entityId={result.journey.id}
        />
        <JourneyDetailPanel journey={result.journey} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Journey backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
