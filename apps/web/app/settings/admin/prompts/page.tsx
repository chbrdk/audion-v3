import { AppShell } from '../../../../components/app-shell'
import { SettingsAdminPromptsPanel } from '../../../../components/settings-admin-prompts-panel'

export default function SettingsAdminPromptsPage() {
  return (
    <AppShell title="Prompts" description="Prompt Builder — Assist templates and persona chat prompts.">
      <SettingsAdminPromptsPanel />
    </AppShell>
  )
}
