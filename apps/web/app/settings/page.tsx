import { AppShell } from '../../components/app-shell'
import { SettingsPage } from '../../components/settings-page'

export default function SettingsRoutePage() {
  return (
    <AppShell titleKey="pages.settings.title" descriptionKey="pages.settings.lead">
      <SettingsPage />
    </AppShell>
  )
}
