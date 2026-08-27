import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminPromptsPanel } from '../../../../components/settings-admin-prompts-panel'

export default function SettingsAdminPromptsPage() {
  return (
    <AppShell descriptionKey="pages.prompts.lead">
      <SettingsAdminPromptsPanel />
    </AppShell>
  )
}
