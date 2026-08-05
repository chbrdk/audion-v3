import Link from 'next/link'
import { Alert, EmptyState, Panel, Text, TopStatus, Chip } from '@msqdx/ui'
import { AppShell } from '../../../components/app-shell'
import { listUxTestFlows } from '../../../lib/ux-test-flows'
import { paths } from '../../../lib/paths'

export default function StudiesFlowsPage() {
  const items = listUxTestFlows()
  return (
    <AppShell
      title="UX Test Flows"
      description="Vorlagen aus wenigen Bausteinen — Study daraus anlegen. Canvas später."
      status={
        <TopStatus level="ok" primary={`${items.length} templates`} secondary="product layer" />
      }
    >
      <p className="msqdx-flow-lede">
        <Link href={paths.routes.studies}>← Studies</Link>
        {' · '}
        Flows sind die produktseitige Schicht; Scenario-Packs bleiben für Labs.
      </p>
      <ul className="audion-tg-grid msqdx-flow-grid">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={paths.routes.studiesFlowDetail(item.id)} className="audion-tg-card">
              <Panel as="div" variant="card" className="audion-tg-card-panel">
                <Text role="meta" as="p">
                  Szenario {item.scenarioIndex}
                  {item.compileReady ? ' · ready' : ' · catalog'}
                </Text>
                <Text role="headline" as="h2" className="audion-tg-card-title">
                  {item.name}
                </Text>
                <p className="audion-tg-card-meta">{item.description}</p>
                <p className="msqdx-flow-chips">
                  <Chip size="sm" static>
                    {item.primaryArchetype}
                  </Chip>
                  {item.nodeKindsUsed.slice(0, 4).map((k) => (
                    <Chip key={k} size="sm" static>
                      {k}
                    </Chip>
                  ))}
                </p>
              </Panel>
            </Link>
          </li>
        ))}
      </ul>
      {!items.length ? <EmptyState>No flow templates.</EmptyState> : null}
      <Alert tone="info">
        Compile-ready (1–3): Study mit Agent-Task. Catalog (4–10): Vorschau der Bausteine, Compile folgt.
      </Alert>
    </AppShell>
  )
}
