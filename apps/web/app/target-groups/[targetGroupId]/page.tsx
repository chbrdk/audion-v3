import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { TargetGroupDetailPanel } from '../../../components/target-group-detail-panel'
import { fetchTargetGroupDetail } from '../../../lib/target-groups'

export default async function TargetGroupDetailPage({
  params,
}: {
  params: Promise<{ targetGroupId: string }>
}) {
  const { targetGroupId } = await params
  try {
    const result = await fetchTargetGroupDetail(targetGroupId)
    return (
      <AppShell
        title={result.targetGroup?.name ?? 'Target group'}
        status={
          <TopStatus
            level={result.targetGroup ? 'ok' : 'warn'}
            primary={result.targetGroup?.status ?? 'missing'}
          />
        }
      >
        <TargetGroupDetailPanel targetGroup={result.targetGroup} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Target group">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Target group backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
