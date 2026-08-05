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
      <div className="msqdx-flow-verdict-row">
        <span className="msqdx-flow-verdict-label">{label}</span>
        <Chip size="sm" static className="msqdx-flow-verdict-chip--open">
          offen
        </Chip>
      </div>
    )
  }
  return (
    <div className="msqdx-flow-verdict-row">
      <span className="msqdx-flow-verdict-label">{label}</span>
      <Chip
        size="sm"
        static
        className={value ? 'msqdx-flow-verdict-chip--ok' : 'msqdx-flow-verdict-chip--no'}
      >
        {value ? 'ja' : 'nein'}
      </Chip>
      {caveat ? <span className="msqdx-flow-verdict-caveat">{caveat}</span> : null}
    </div>
  )
}

export function UxFlowVerdictCard({ verdict }: { verdict: FlowRunVerdict | null }) {
  if (!verdict || verdict.status === 'pending') return null

  const evidenceValue =
    verdict.status === 'running' ? null : verdict.validEvidence

  return (
    <section className="msqdx-flow-verdict" aria-label="Flow Verdict">
      <Text as="p" className="msqdx-flow-verdict-lede">
        {verdict.summary}
      </Text>
      <div className="msqdx-flow-verdict-grid">
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
        <p className="msqdx-flow-verdict-terminal">
          Terminal: <strong>{verdict.terminalKind}</strong>
          {verdict.terminalLabel ? ` — ${verdict.terminalLabel}` : ''}
        </p>
      ) : null}
      {verdict.gatesOnPath.length ? (
        <div className="msqdx-flow-verdict-gates">
          <span className="msqdx-flow-verdict-gates-label">Gates auf Pfad</span>
          <div className="msqdx-flow-verdict-gate-chips">
            {verdict.gatesOnPath.map((g) => (
              <span key={g.gateNodeId} title={g.evidence ?? undefined}>
                <Chip
                  size="sm"
                  static
                  className={
                    g.matched ? 'msqdx-flow-verdict-chip--ok' : 'msqdx-flow-verdict-chip--gate'
                  }
                >
                  {g.condition}
                  {g.branchTaken ? ` · ${g.branchTaken}` : ''}
                  {g.matched ? ' ✓' : ''}
                </Chip>
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {verdict.blockers.length ? (
        <p className="msqdx-flow-verdict-blockers">
          Blocker: {verdict.blockers.join(', ')}
        </p>
      ) : null}
    </section>
  )
}
