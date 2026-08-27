import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminProvidersPanel } from '../../../../components/settings-admin-providers-panel'

export default function SettingsAdminProvidersPage() {
  return (
    <AppShell titleKey="pages.providers.title" descriptionKey="pages.providers.lead">
      <SettingsAdminProvidersPanel />
    </AppShell>
  )
}
