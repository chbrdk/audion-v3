import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminTokensPanel } from '../../../../components/settings-admin-tokens-panel'

export default function SettingsAdminTokensPage() {
  return (
    <AppShell titleKey="pages.tokens.title" descriptionKey="pages.tokens.lead">
      <SettingsAdminTokensPanel />
    </AppShell>
  )
}
