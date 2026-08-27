import { Alert } from '@msqdx/ui'
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
    return (
      <AppShell>
        <ProjectListPanel list={list} query={query} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell descriptionKey="pages.projects.lead">
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Project backend unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
