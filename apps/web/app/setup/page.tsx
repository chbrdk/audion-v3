import { AppShell } from '../../components/app-shell'
import { EasySetupPanel } from '../../components/easy-setup-panel'

export default function SetupPage() {
  return (
    <AppShell
      title="Easy setup"
      description="Bootstrap a project, target group, and persona from one brief."
    >
      <EasySetupPanel />
    </AppShell>
  )
}
