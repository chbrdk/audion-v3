import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { JourneyListPanel } from '../../components/journey-list-panel'
import { fetchJourneyList, filterJourneyList } from '../../lib/journeys'

export default async function JourneysPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const params = (await searchParams) || {}
  const query = typeof params.q === 'string' ? params.q : ''
  try {
    const result = await fetchJourneyList()
    const list = filterJourneyList(result, query)
    const demo = result.origin === 'fixtures'
    return (
      <AppShell
        title="Journeys"
        description={demo ? 'Demo fixtures — API offline.' : undefined}
        status={
          <TopStatus
            level="ok"
            primary={demo ? 'demo data' : `${list.total} journeys`}
            secondary={demo ? `${list.total} fixtures` : 'live'}
          />
        }
      >
        <JourneyListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Journeys" description="Browse customer journey maps.">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Journey backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
