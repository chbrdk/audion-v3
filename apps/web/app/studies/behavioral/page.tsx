import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { BehavioralScoreboardPanel } from '../../../components/behavioral-scoreboard-panel'
import { listBehavioralPolicyScoreboards } from '../../../lib/behavior/gold-store'

export default function BehavioralGoldPage() {
  try {
    const scoreboards = listBehavioralPolicyScoreboards()
    return (
      <AppShell>
        <BehavioralScoreboardPanel scoreboards={scoreboards} />
      </AppShell>
    )
  } catch (error) {
    return (
      <AppShell>
        <Alert tone="error">
          {error instanceof Error ? error.message : 'Behavioral scoreboard unavailable.'}
        </Alert>
      </AppShell>
    )
  }
}
