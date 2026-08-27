import { Alert } from '@msqdx/ui'
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
      <AppShell>
        <TargetGroupDetailPanel targetGroup={result.targetGroup} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Target group backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
