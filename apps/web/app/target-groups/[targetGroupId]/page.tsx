import { notFound, redirect } from 'next/navigation'
import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { TargetGroupDetailPanel } from '../../../components/target-group-detail-panel'
import { entityRouteKey } from '../../../lib/entity-slug'
import { fetchProjectDetail } from '../../../lib/projects'
import { paths } from '../../../lib/paths'
import { fetchTargetGroupDetail } from '../../../lib/target-groups'

export default async function TargetGroupDetailPage({
  params,
}: {
  params: Promise<{ targetGroupId: string }>
}) {
  const { targetGroupId } = await params
  let result: Awaited<ReturnType<typeof fetchTargetGroupDetail>>
  try {
    result = await fetchTargetGroupDetail(targetGroupId)
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Target group backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
  if (!result.targetGroup) notFound()
  const canonical = entityRouteKey(result.targetGroup)
  if (canonical !== targetGroupId) {
    redirect(paths.routes.targetGroupDetail(canonical))
  }
  let project: { id: string; name: string } | null = null
  try {
    const projectId = result.targetGroup.projectId?.trim() || null
    const projectResult = projectId ? await fetchProjectDetail(projectId) : null
    project =
      projectResult?.project != null
        ? { id: projectResult.project.id, name: projectResult.project.name }
        : null
  } catch {
    project = null
  }
  return (
    <AppShell>
      <TargetGroupDetailPanel targetGroup={result.targetGroup} project={project} />
    </AppShell>
  )
}
