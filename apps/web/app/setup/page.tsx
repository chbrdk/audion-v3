import { AppShell } from '../../components/app-shell'
import { EasySetupPanel } from '../../components/easy-setup-panel'

export default function SetupPage() {
  return (
    <AppShell titleKey="pages.setup.title" descriptionKey="pages.setup.lead">
      <EasySetupPanel />
    </AppShell>
  )
}
