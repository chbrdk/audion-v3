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
    const demo = result.origin === 'fixtures'
    return (
      <AppShell
        title={result.project?.name ?? 'Project'}
        description={demo ? 'Demo fixtures — API offline.' : undefined}
        status={
          <TopStatus
            level={result.project ? 'ok' : 'warn'}
            primary={result.project ? (demo ? 'demo data' : 'live') : 'missing'}
            secondary={result.project?.status ?? 'not found'}
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
