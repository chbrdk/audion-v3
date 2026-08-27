import { Alert } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { HubTopStatus } from '../../components/hub-top-status'
import { StudyListPanel } from '../../components/study-list-panel'
import { fetchUxStudyList, filterUxStudyList } from '../../lib/ux-studies'

export default async function StudiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const params = (await searchParams) || {}
  const query = typeof params.q === 'string' ? params.q : ''
  try {
    const result = await fetchUxStudyList()
    const list = filterUxStudyList(result, query)
    return (
      <AppShell
        titleKey="pages.studies.title"
        status={<HubTopStatus total={list.total} entity="studies" />}
      >
        <StudyListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell titleKey="pages.studies.title" descriptionKey="pages.studies.lead">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'UX studies backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
