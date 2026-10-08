import { Alert } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { BehavioralScoreboardPanel } from '../../../components/behavioral-scoreboard-panel'
import {
  listBehavioralGoldObservations,
  listBehavioralPolicyScoreboards,
} from '../../../lib/behavior/gold-store'

export default function BehavioralGoldPage() {
  try {
    const scoreboards = listBehavioralPolicyScoreboards()
    const observations = listBehavioralGoldObservations().slice(0, 40)
    return (
      <AppShell>
        <BehavioralScoreboardPanel
          scoreboards={scoreboards}
          initialObservations={observations}
        />
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
