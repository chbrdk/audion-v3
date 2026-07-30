import { AppShell } from '../../../components/app-shell'
import { SettingsAdminHubPanel } from '../../../components/settings-admin-hub-panel'

export default function SettingsAdminPage() {
  return (
    <AppShell
      title="Settings admin"
      description="Providers, assist prompts, and API route catalog."
    >
      <SettingsAdminHubPanel />
    </AppShell>
  )
}
