import { AppShell } from '../../../components/app-shell'
import { SettingsAdminHubPanel } from '../../../components/settings-admin-hub-panel'

export default function SettingsAdminPage() {
  return (
    <AppShell descriptionKey="pages.settingsAdmin.lead">
      <SettingsAdminHubPanel />
    </AppShell>
  )
}
