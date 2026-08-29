import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { TargetGroupDetailPanel } from '../../../components/target-group-detail-panel'
import { fetchProjectDetail } from '../../../lib/projects'
import { fetchTargetGroupDetail } from '../../../lib/target-groups'

export default async function TargetGroupDetailPage({
  params,
}: {
  params: Promise<{ targetGroupId: string }>
}) {
  const { targetGroupId } = await params
  try {
    const result = await fetchTargetGroupDetail(targetGroupId)
    const projectId = result.targetGroup?.projectId?.trim() || null
    const projectResult = projectId ? await fetchProjectDetail(projectId) : null
    const project =
      projectResult?.project != null
        ? { id: projectResult.project.id, name: projectResult.project.name }
        : null
    return (
      <AppShell>
        <TargetGroupDetailPanel targetGroup={result.targetGroup} project={project} />
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
