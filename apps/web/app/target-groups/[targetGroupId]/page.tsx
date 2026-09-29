import { notFound, redirect } from 'next/navigation'
import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { AssistantPageContextPublisher } from '../../../components/assistant-page-context'
import { TargetGroupDetailPanel } from '../../../components/target-group-detail-panel'
import { ASSISTANT_ENTITY_TARGET_GROUP } from '../../../lib/assistant-page-context'
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
  let platformProjectId: string | null = null
  try {
    const projectId = result.targetGroup.projectId?.trim() || null
    const projectResult = projectId ? await fetchProjectDetail(projectId) : null
    project =
      projectResult?.project != null
        ? { id: projectResult.project.id, name: projectResult.project.name }
        : null
    platformProjectId = projectResult?.project?.platformProjectId ?? null
  } catch {
    project = null
  }
  return (
    <AppShell>
      <AssistantPageContextPublisher
        platformProjectId={platformProjectId}
        entityType={ASSISTANT_ENTITY_TARGET_GROUP}
        entityId={result.targetGroup.id}
      />
      <TargetGroupDetailPanel targetGroup={result.targetGroup} project={project} />
    </AppShell>
  )
}
