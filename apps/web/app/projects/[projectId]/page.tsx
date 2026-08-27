import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { ProjectDetailPanel } from '../../../components/project-detail-panel'
import { fetchPersonaList } from '../../../lib/personas'
import { fetchProjectDetail } from '../../../lib/projects'
import { fetchTargetGroupList } from '../../../lib/target-groups'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  try {
    const [result, personasResult, groupsResult] = await Promise.all([
      fetchProjectDetail(projectId),
      fetchPersonaList(),
      fetchTargetGroupList(),
    ])
    const personas = personasResult.items.filter((p) => p.projectId === projectId)
    const targetGroups = groupsResult.items.filter((g) => g.projectId === projectId)
    return (
      <AppShell
        title={result.project?.name ?? 'Project'}
        status={
          <TopStatus
            level={result.project ? 'ok' : 'warn'}
            primary={result.project?.status ?? 'missing'}
          />
        }
      >
        <ProjectDetailPanel
          project={result.project}
          personas={personas}
          targetGroups={targetGroups}
        />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Project">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Project backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
