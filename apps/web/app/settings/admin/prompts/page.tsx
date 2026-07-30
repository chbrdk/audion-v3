import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminPromptsPanel } from '../../../../components/settings-admin-prompts-panel'

export default function SettingsAdminPromptsPage() {
  return (
    <AppShell title="Prompts" description="Native assist templates and prompt test.">
      <SettingsAdminPromptsPanel />
    </AppShell>
  )
}
