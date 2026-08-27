import { Alert } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { HubTopStatus } from '../../components/hub-top-status'
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
    return (
      <AppShell
        titleKey="pages.journeys.title"
        status={<HubTopStatus total={list.total} entity="journeys" />}
      >
        <JourneyListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell titleKey="pages.journeys.title" descriptionKey="pages.journeys.lead">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Journey backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
