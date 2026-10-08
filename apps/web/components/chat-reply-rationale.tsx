'use client'

import type { ChatReplyRationale } from '@audion-v3/contracts'
import { ChatCollapsible, Chip } from '@msqdx/ui'
import { sourceLabel } from '../lib/behavior/reply-rationale'
import { useT } from '../lib/user-prefs'

function pct(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100)
}

function stanceLabel(
  stance: ChatReplyRationale['stance'],
  t: (key: string) => string,
): string {
  if (stance === 'hesitate') return t('chatExtra.rationaleStanceHesitate')
  if (stance === 'abandon') return t('chatExtra.rationaleStanceCurt')
  return t('chatExtra.rationaleStanceProceed')
}

function laneLabel(lane: ChatReplyRationale['lane'], t: (key: string) => string): string {
  return t(`chatExtra.rationaleLane.${lane}`)
}

/**
 * Compact “Why this reply” strip above an assistant answer.
 * Spec: chat-workspace.md § Reply rationale
 */
export function ChatReplyRationaleStrip({
  rationale,
}: {
  rationale: ChatReplyRationale
}) {
  const t = useT()
  return (
    <ChatCollapsible
      className="audion-chat-reply-rationale"
      density="compact"
      title={t('chatExtra.whyThisReply')}
      defaultOpen={false}
      data-policy-id={rationale.policyId}
    >
      <p className="audion-chat-reply-rationale-summary" role="status">
        {rationale.summary}
      </p>
      <ul className="audion-chat-reply-rationale-meta" aria-label={t('chatExtra.whyThisReply')}>
        <li>
          <Chip static size="sm" className="audion-chat-inspect-chip is-count">
            {laneLabel(rationale.lane, t)}
          </Chip>
        </li>
        <li>
          <Chip static size="sm" className="audion-chat-inspect-chip is-count">
            {stanceLabel(rationale.stance, t)}
          </Chip>
        </li>
        <li>
          <Chip static size="sm" className="audion-chat-inspect-chip is-count">
            {t('chatExtra.rationaleFrustration', { n: pct(rationale.frustrationLoad) })}
          </Chip>
        </li>
        {rationale.fatigue >= 0.25 ? (
          <li>
            <Chip static size="sm" className="audion-chat-inspect-chip is-count">
              {t('chatExtra.rationaleFatigue', { n: pct(rationale.fatigue) })}
            </Chip>
          </li>
        ) : null}
      </ul>

      {rationale.drivers.length ? (
        <ul
          className="audion-chat-reply-rationale-drivers audion-chat-inspect-policy-chips"
          aria-label={t('chatExtra.rationaleDrivers')}
        >
          {rationale.drivers.map((dim) => (
            <li key={dim.key}>
              <span
                title={`${dim.label} ${pct(dim.value)}% · ${sourceLabel(dim.source)}${
                  dim.ref ? ` · ${dim.ref}` : ''
                }`}
              >
                <Chip
                  static
                  size="sm"
                  className={[
                    'audion-chat-inspect-chip',
                    dim.direction === 'up'
                      ? 'is-up'
                      : dim.direction === 'down'
                        ? 'is-down'
                        : 'is-count',
                  ].join(' ')}
                >
                  {dim.label}
                  <span className="audion-chat-inspect-chip-dir" aria-hidden>
                    {dim.direction === 'up' ? '↑' : dim.direction === 'down' ? '↓' : '·'}
                  </span>
                  <span className="audion-chat-reply-rationale-src">
                    {sourceLabel(dim.source)}
                  </span>
                </Chip>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {rationale.stressHits?.length ? (
        <p className="audion-chat-reply-rationale-hits">
          <span className="audion-chat-inspect-policy-kicker">
            {t('chatExtra.rationaleStressHits')}
          </span>{' '}
          {rationale.stressHits.join(' · ')}
        </p>
      ) : null}
    </ChatCollapsible>
  )
}
