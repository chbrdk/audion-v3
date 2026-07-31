'use client'

import { useEffect, useRef } from 'react'
import type { ChatUxJourneyStep } from '@audion-v3/contracts'
import { chatUxJourneyStepShotSrc } from '../lib/chat/ux-journey-steps'

function actionLabel(action?: string): string {
  const a = (action || '').toLowerCase()
  if (a === 'navigate') return 'Navigate'
  if (a === 'click') return 'Click'
  if (a === 'scroll') return 'Scroll'
  if (a === 'input' || a === 'type' || a === 'send_keys') return 'Type'
  if (a === 'done') return 'Done'
  if (a) return a
  return 'Step'
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * Horizontal step cards for a live / finished UX journey inspect run (V2-parity).
 */
export function UxJourneyStepsStrip({
  steps,
  stepsTotal,
  running = false,
}: {
  steps: ChatUxJourneyStep[]
  stepsTotal?: number | null
  running?: boolean
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
  }, [steps.length])

  if (!steps.length) {
    return running ? (
      <p className="audion-muted audion-ux-steps-empty">Waiting for first step…</p>
    ) : null
  }

  const total = stepsTotal && stepsTotal > 0 ? stepsTotal : undefined

  return (
    <section className="audion-ux-steps" aria-label="Journey steps">
      <p className="audion-ux-steps-heading">
        Steps ({steps.length}
        {total ? ` of ${total}` : ''})
      </p>
      <div className="audion-ux-steps-scroller" ref={scrollerRef}>
        {steps.map((s, idx) => {
          const n = s.step ?? idx + 1
          const shot = chatUxJourneyStepShotSrc(s)
          const reasoning = s.reasoning?.trim() || s.result?.trim() || ''
          return (
            <article key={`${n}-${idx}`} className="audion-ux-step-card">
              <header className="audion-ux-step-card-head">
                <span className={`audion-ux-step-action is-${(s.action || 'step').toLowerCase()}`}>
                  {actionLabel(s.action)}
                </span>
                <span className="audion-muted">
                  Step {n}
                  {total ? ` of ${total}` : ''}
                </span>
              </header>
              {shot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shot}
                  alt={`Step ${n} screenshot`}
                  className="audion-ux-step-shot"
                />
              ) : null}
              {s.target?.trim() ? (
                <p className="audion-ux-step-target">
                  <span className="audion-muted">Target</span> {truncate(s.target, 160)}
                </p>
              ) : null}
              {reasoning ? (
                <p className="audion-ux-step-reasoning">{truncate(reasoning, 420)}</p>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
