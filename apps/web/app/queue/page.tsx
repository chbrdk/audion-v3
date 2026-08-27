import { AppShell } from '../../components/app-shell'
import { QueueDashboardPanel } from '../../components/queue-dashboard-panel'

export default async function QueuePage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>
}) {
  const params = (await searchParams) || {}
  const projectId = typeof params.projectId === 'string' ? params.projectId : null

  return (
    <AppShell descriptionKey="pages.queue.lead">
      <QueueDashboardPanel projectId={projectId} />
    </AppShell>
  )
}
