import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminTokensPanel } from '../../../../components/settings-admin-tokens-panel'

export default function SettingsAdminTokensPage() {
  return (
    <AppShell descriptionKey="pages.tokens.lead">
      <SettingsAdminTokensPanel />
    </AppShell>
  )
}
