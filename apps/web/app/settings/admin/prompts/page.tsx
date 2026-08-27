import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminPromptsPanel } from '../../../../components/settings-admin-prompts-panel'

export default function SettingsAdminPromptsPage() {
  return (
    <AppShell titleKey="pages.prompts.title" descriptionKey="pages.prompts.lead">
      <SettingsAdminPromptsPanel />
    </AppShell>
  )
}
