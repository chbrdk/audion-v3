import { AppShell } from '../components/app-shell'
import { HomeTopbarActions, HomeWorkspacePanel } from '../components/home-workspace-panel'

export default function HomePage() {
  return (
    <AppShell
      titleKey="pages.home.title"
      descriptionKey="pages.home.lead"
      actions={<HomeTopbarActions />}
    >
      <HomeWorkspacePanel />
    </AppShell>
  )
}
