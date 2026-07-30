import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminApiDocsPanel } from '../../../../components/settings-admin-api-docs-panel'

export default function SettingsAdminApiDocsPage() {
  return (
    <AppShell title="API docs" description="Route catalog and live health JSON.">
      <SettingsAdminApiDocsPanel />
    </AppShell>
  )
}
