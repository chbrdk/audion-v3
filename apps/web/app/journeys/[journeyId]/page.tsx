import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { JourneyDetailPanel } from '../../../components/journey-detail-panel'
import { fetchJourneyDetail } from '../../../lib/journeys'

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ journeyId: string }>
}) {
  const { journeyId } = await params
  try {
    const result = await fetchJourneyDetail(journeyId)
    return (
      <AppShell
        status={
          <TopStatus
            level={result.journey ? 'ok' : 'warn'}
            primary={result.journey?.status ?? 'missing'}
          />
        }
      >
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
