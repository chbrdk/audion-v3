import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminApiDocsPanel } from '../../../../components/settings-admin-api-docs-panel'

export default function SettingsAdminApiDocsPage() {
  return (
    <AppShell titleKey="pages.apiDocs.title" descriptionKey="pages.apiDocs.lead">
      <SettingsAdminApiDocsPanel />
    </AppShell>
  )
}
