import { AppShell } from '../../components/app-shell'
import { SettingsPage } from '../../components/settings-page'

export default function SettingsRoutePage() {
  return (
    <AppShell title="Settings" description="Profile, appearance, and language.">
      <SettingsPage />
    </AppShell>
  )
}
