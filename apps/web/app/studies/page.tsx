import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
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
    const demo = result.origin === 'fixtures'
    return (
      <AppShell
        title="UX Studies"
        description={demo ? 'Demo fixtures — Study → Wave → Evaluate → Compare.' : undefined}
        status={
          <TopStatus
            level="ok"
            primary={demo ? 'demo data' : `${list.total} studies`}
            secondary={demo ? `${list.total} fixtures` : 'live'}
          />
        }
      >
        <StudyListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="UX Studies" description="Browse UX study waves.">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'UX studies backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
