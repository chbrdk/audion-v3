import Link from 'next/link'
import type { BehavioralPolicyScoreboard } from '@audion-v3/contracts'
import { Button, Chip, EmptyState, Panel, Text } from '@msqdx/ui'
import { paths } from '../lib/paths'

export function BehavioralScoreboardPanel({
  scoreboards,
}: {
  scoreboards: BehavioralPolicyScoreboard[]
}) {
  return (
    <section className="audion-index audion-tg-index">
      <div className="msqdx-flow-studies-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link href={paths.routes.studies}>
          <Button type="button" size="sm" variant="subtle">
            Studies
          </Button>
        </Link>
        <Link href={paths.routes.studiesFlows}>
          <Button type="button" size="sm" variant="subtle">
            Flows
          </Button>
        </Link>
      </div>

      <Text role="headline" as="h1" className="audion-tg-card-title">
        Behavioral gold
      </Text>
      <p className="audion-tg-card-meta">
        Fidelity ledger by policyId — synthetic chat/video vs human-gold bands (closer needs n≥3).
      </p>

      {!scoreboards.length ? (
        <EmptyState>
          No observations yet. Chat turns and video starts record automatically. POST{' '}
          {paths.routes.apiBehavioralScoreboard} with label human_gold for paired humans.
        </EmptyState>
      ) : (
        <ul className="audion-tg-grid">
          {scoreboards.map((board) => (
            <li key={board.policyId}>
              <Panel as="div" variant="card" className="audion-tg-card-panel">
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <Chip size="sm">{board.closer ? 'closer' : 'not closer'}</Chip>
                  <Chip size="sm">score {board.score.toFixed(2)}</Chip>
                  <Chip size="sm">n={board.n}</Chip>
                </div>
                <Text role="headline" as="h2" className="audion-tg-card-title">
                  <code>{board.policyId}</code>
                </Text>
                <p className="audion-tg-card-meta">{board.verdict}</p>
                <p className="audion-tg-card-meta">
                  frustr {board.means.frustrationLoad.toFixed(2)} · fatigue{' '}
                  {board.means.fatigue.toFixed(2)} · timeP {board.means.timePressure.toFixed(2)} ·
                  synth {board.syntheticCount} · gold {board.humanGoldCount}
                </p>
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                  {board.checks.map((c) => (
                    <li key={c.id} className="audion-tg-card-meta">
                      {c.pass ? '✓' : '○'} {c.label}: {c.detail}
                    </li>
                  ))}
                </ul>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
