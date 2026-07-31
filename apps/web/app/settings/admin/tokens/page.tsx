import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminTokensPanel } from '../../../../components/settings-admin-tokens-panel'

export default function SettingsAdminTokensPage() {
  return (
    <AppShell title="API tokens" description="Create and revoke personal Bearer tokens.">
      <SettingsAdminTokensPanel />
    </AppShell>
  )
}
