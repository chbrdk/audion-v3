import { Alert, TopStatus } from '@msqdx/ui'
import { AppShell } from '../../components/app-shell'
import { ProjectListPanel } from '../../components/project-list-panel'
import { fetchProjectList, filterProjectList } from '../../lib/projects'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const params = (await searchParams) || {}
  const query = typeof params.q === 'string' ? params.q : ''
  try {
    const result = await fetchProjectList()
    const list = filterProjectList(result, query)
    const demo = result.origin === 'fixtures'
    return (
      <AppShell
        title="Projects"
        description={
          demo
            ? 'Local fixtures (no DATABASE_URL). Staging uses Postgres — Plexon-synced projects survive redeploy.'
            : undefined
        }
        status={
          <TopStatus
            level="ok"
            primary={demo ? 'demo data' : `${list.total} projects`}
            secondary={demo ? `${list.total} fixtures` : 'live'}
          />
        }
      >
        <ProjectListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell title="Projects" description="Browse workspaces.">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Project backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
