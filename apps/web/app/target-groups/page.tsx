import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { TargetGroupListPanel } from '../../components/target-group-list-panel'
import { fetchTargetGroupList, filterTargetGroupList } from '../../lib/target-groups'

export default async function TargetGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const params = (await searchParams) || {}
  const query = typeof params.q === 'string' ? params.q : ''
  try {
    const result = await fetchTargetGroupList()
    const list = filterTargetGroupList(result, query)
    const demo = result.origin === 'fixtures'
    return (
      <AppShell
        title="Target groups"
        description={demo ? 'Demo fixtures — API offline.' : undefined}
        status={
          <TopStatus
            level="ok"
            primary={demo ? 'demo data' : `${list.total} groups`}
            secondary={demo ? `${list.total} fixtures` : 'live'}
          />
        }
      >
        <TargetGroupListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Target groups" description="Browse audience segments.">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Target group backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
