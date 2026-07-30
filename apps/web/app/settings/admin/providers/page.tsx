import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminProvidersPanel } from '../../../../components/settings-admin-providers-panel'

export default function SettingsAdminProvidersPage() {
  return (
    <AppShell title="Providers" description="Read-only AI and auth provider status.">
      <SettingsAdminProvidersPanel />
    </AppShell>
  )
}
