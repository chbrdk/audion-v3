import { AppShell } from '../../../components/app-shell'
import { SettingsAdminHubPanel } from '../../../components/settings-admin-hub-panel'

export default function SettingsAdminPage() {
  return (
    <AppShell titleKey="pages.settingsAdmin.title" descriptionKey="pages.settingsAdmin.lead">
      <SettingsAdminHubPanel />
    </AppShell>
  )
}
