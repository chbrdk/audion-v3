'use client'

import type { FlowRunVerdict } from '../lib/ux-flow-verdict'
import { Chip, Text } from '@msqdx/ui'

function VerdictRow({
  label,
  value,
  caveat,
}: {
  label: string
  value: boolean | null
  caveat?: string | null
}) {
  if (value == null) {
    return (
      <div className="audion-flow-verdict-row">
        <span className="audion-flow-verdict-label">{label}</span>
        <Chip size="sm" static className="audion-flow-verdict-chip--open">
          offen
        </Chip>
      </div>
    )
  }
  return (
    <div className="audion-flow-verdict-row">
      <span className="audion-flow-verdict-label">{label}</span>
      <Chip
        size="sm"
        static
        className={value ? 'audion-flow-verdict-chip--ok' : 'audion-flow-verdict-chip--no'}
      >
        {value ? 'ja' : 'nein'}
      </Chip>
      {caveat ? <span className="audion-flow-verdict-caveat">{caveat}</span> : null}
    </div>
  )
}

export function UxFlowVerdictCard({ verdict }: { verdict: FlowRunVerdict | null }) {
  if (!verdict || verdict.status === 'pending') return null

  const evidenceValue =
    verdict.status === 'running' ? null : verdict.validEvidence

  return (
    <section className="audion-flow-verdict" aria-label="Flow Verdict">
      <Text as="p" className="audion-flow-verdict-lede">
        {verdict.summary}
      </Text>
      <div className="audion-flow-verdict-grid">
        <VerdictRow
          label="Flow abgeschlossen"
          value={verdict.status === 'running' ? null : verdict.flowCompleted}
        />
        <VerdictRow label="Task completed" value={verdict.status === 'running' ? null : verdict.taskCompleted} />
        <VerdictRow
          label="Valid evidence"
          value={evidenceValue}
          caveat={verdict.validEvidenceCaveat}
        />
        <VerdictRow
          label="Goal reached"
          value={verdict.goalReached}
        />
      </div>
      {verdict.terminalLabel ? (
        <p className="audion-flow-verdict-terminal">
          Terminal: <strong>{verdict.terminalKind}</strong>
          {verdict.terminalLabel ? ` — ${verdict.terminalLabel}` : ''}
        </p>
      ) : null}
      {verdict.gatesOnPath.length ? (
        <div className="audion-flow-verdict-gates">
          <span className="audion-flow-verdict-gates-label">Gates auf Pfad</span>
          <div className="audion-flow-verdict-gate-chips">
            {verdict.gatesOnPath.map((g) => (
              <Chip
                key={g.gateNodeId}
                size="sm"
                static
                className={
                  g.matched ? 'audion-flow-verdict-chip--ok' : 'audion-flow-verdict-chip--gate'
                }
                title={g.evidence ?? undefined}
              >
                {g.condition}
                {g.branchTaken ? ` · ${g.branchTaken}` : ''}
                {g.matched ? ' ✓' : ''}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
      {verdict.blockers.length ? (
        <p className="audion-flow-verdict-blockers">
          Blocker: {verdict.blockers.join(', ')}
        </p>
      ) : null}
    </section>
  )
}
