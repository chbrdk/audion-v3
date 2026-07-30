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
    const demo = result.origin === 'fixtures'
    return (
      <AppShell
        title={result.journey?.name ?? 'Journey'}
        description={demo ? 'Demo fixtures — API offline.' : undefined}
        status={
          <TopStatus
            level={result.journey ? 'ok' : 'warn'}
            primary={result.journey ? (demo ? 'demo data' : 'live') : 'missing'}
            secondary={result.journey?.status ?? 'not found'}
          />
        }
      >
        <JourneyDetailPanel journey={result.journey} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Journey">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Journey backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
