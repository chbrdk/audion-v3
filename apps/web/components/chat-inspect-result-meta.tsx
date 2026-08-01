'use client'

import React from 'react'
import { Chip } from '@msqdx/ui'
import {
  parsePersonaPolicyMeta,
  type PersonaPolicySnapshot,
} from '../lib/chat/persona-agent-context'
import { parseScorecardMeta } from '../lib/chat/ux-journey-steps'

function scoreTone(kind: 'friction' | 'fit', value: number): 'good' | 'mid' | 'bad' {
  if (kind === 'friction') {
    if (value <= 3) return 'good'
    if (value >= 7) return 'bad'
    return 'mid'
  }
  if (value >= 7) return 'good'
  if (value <= 3) return 'bad'
  return 'mid'
}

function ScoreBar({
  label,
  value,
  kind,
}: {
  label: string
  value: number
  kind: 'friction' | 'fit'
}) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100))
  const tone = scoreTone(kind, value)
  return (
    <div className="audion-chat-inspect-score" data-tone={tone}>
      <span className="audion-chat-inspect-score-label">{label}</span>
      <span
        className="audion-chat-inspect-score-track"
        role="meter"
        aria-label={`${label} ${value} of 10`}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
      >
        <span className="audion-chat-inspect-score-fill" style={{ width: `${pct}%` }} />
      </span>
      <strong className="audion-chat-inspect-score-value">
        {value}
        <span aria-hidden>/10</span>
      </strong>
    </div>
  )
}

/**
 * Visual scorecard + persona-policy strip for the inspect EventFooter.
 */
export function ChatInspectResultMeta({
  scorecard,
  personaPolicy,
}: {
  scorecard?: Record<string, unknown> | null
  personaPolicy?: PersonaPolicySnapshot | null
}) {
  const scores = parseScorecardMeta(scorecard)
  const policy = parsePersonaPolicyMeta(personaPolicy)
  if (!scores && !policy) return null

  return (
    <div className="audion-chat-inspect-meta">
      {scores && (scores.friction != null || scores.fit != null) ? (
        <div className="audion-chat-inspect-scores" aria-label="Inspection scorecard">
          {scores.friction != null ? (
            <ScoreBar label="Friction" value={scores.friction} kind="friction" />
          ) : null}
          {scores.fit != null ? (
            <ScoreBar label="Persona fit" value={scores.fit} kind="fit" />
          ) : null}
        </div>
      ) : null}

      {scores && (scores.strength || scores.weakness) ? (
        <ul className="audion-chat-inspect-highlights" aria-label="Top findings">
          {scores.strength ? (
            <li>
              <Chip static size="sm" className="audion-chat-inspect-chip is-pos">
                <span aria-hidden>+</span> {scores.strength}
              </Chip>
            </li>
          ) : null}
          {scores.weakness ? (
            <li>
              <Chip static size="sm" className="audion-chat-inspect-chip is-neg">
                <span aria-hidden>−</span> {scores.weakness}
              </Chip>
            </li>
          ) : null}
        </ul>
      ) : null}

      {policy ? (
        <div className="audion-chat-inspect-policy audion-chat-persona-policy" aria-label="Persona policy">
          <span className="audion-chat-inspect-policy-kicker">Policy</span>
          <ul className="audion-chat-inspect-policy-chips">
            {policy.dims.map((dim) => (
              <li key={dim.key}>
                <Chip
                  static
                  size="sm"
                  className={[
                    'audion-chat-inspect-chip',
                    dim.direction === 'up' ? 'is-up' : 'is-down',
                  ].join(' ')}
                  title={`${dim.label} ${Math.round(dim.value * 100)}%`}
                >
                  {dim.label}
                  <span className="audion-chat-inspect-chip-dir" aria-hidden>
                    {dim.direction === 'up' ? '↑' : '↓'}
                  </span>
                </Chip>
              </li>
            ))}
            {policy.heuristicCount > 0 ? (
              <li>
                <Chip static size="sm" className="audion-chat-inspect-chip is-count">
                  {policy.heuristicCount} heuristic{policy.heuristicCount === 1 ? '' : 's'}
                </Chip>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
