import { Alert } from '@msqdx/ui'
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
    return (
      <AppShell>
        <TargetGroupListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell descriptionKey="pages.targetGroups.lead">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Target group backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
