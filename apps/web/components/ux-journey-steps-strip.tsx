'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import type { ChatUxJourneyStep } from '@audion-v3/contracts'
import { Panel, SectionChrome, Text } from '@msqdx/ui'
import { chatUxJourneyStepShotSrc } from '../lib/chat/ux-journey-steps'

function actionLabel(action?: string): string {
  const a = (action || '').toLowerCase()
  if (a === 'navigate') return 'Navigate'
  if (a === 'click') return 'Click'
  if (a === 'scroll') return 'Scroll'
  if (a === 'input' || a === 'type' || a === 'send_keys') return 'Type'
  if (a === 'done') return 'Done'
  if (a) return a.charAt(0).toUpperCase() + a.slice(1)
  return 'Step'
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function StepSection({
  label,
  children,
  open = true,
}: {
  label: string
  children: ReactNode
  open?: boolean
}) {
  return (
    <details className="audion-journey-slide-section audion-ux-step-section" open={open}>
      <summary className="audion-ux-step-section-summary">
        <Text role="label" className="audion-journey-slide-section-label">
          {label}
        </Text>
      </summary>
      <div className="audion-ux-step-section-body">{children}</div>
    </details>
  )
}

/**
 * Live / finished UX journey steps — phase-card chrome + V2 think-aloud sections.
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
    const cards = el.querySelectorAll<HTMLElement>('[data-step-index]')
    const last = cards[cards.length - 1]
    if (!last) return
    const left = last.offsetLeft - (el.clientWidth - last.offsetWidth) / 2
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  }, [steps.length])

  if (!steps.length) {
    return running ? (
      <p className="audion-muted audion-ux-steps-empty">Waiting for first step…</p>
    ) : null
  }

  const total = stepsTotal && stepsTotal > 0 ? stepsTotal : undefined
  const activeIdx = running ? steps.length - 1 : -1
  const meta = total ? `${steps.length} / ${total}` : `${steps.length}`

  return (
    <section className="audion-ux-steps" aria-label="Journey steps">
      <SectionChrome quiet title="Steps" meta={meta} metaTone="accent" as="h3" />
      <div
        className="audion-journey-timeline-viewport audion-ux-steps-scroller"
        ref={scrollerRef}
        tabIndex={0}
        aria-label="Step cards"
      >
        {steps.map((s, idx) => {
          const n = s.step ?? idx + 1
          const shot = chatUxJourneyStepShotSrc(s)
          const denken = s.reasoning?.trim() || ''
          const gesehenes = s.reasoningMeta?.evaluation_previous_goal?.trim() || ''
          const wissen = s.reasoningMeta?.memory?.trim() || ''
          const nextStep = s.reasoningMeta?.next_goal?.trim() || ''
          const result = s.result?.trim() || ''
          const target = s.target?.trim() || ''
          const title = actionLabel(s.action)
          const active = idx === activeIdx
          const hasThinkAloud = Boolean(denken || gesehenes || wissen || nextStep || result)
          return (
            <article
              key={`${n}-${idx}`}
              className={`audion-journey-slide audion-ux-step-slide${active ? ' audion-journey-slide--active' : ''}`}
              data-step-index={idx}
              aria-current={active ? 'step' : undefined}
              aria-label={`Step ${n}: ${title}`}
            >
              <Panel as="div" className="audion-journey-slide-panel">
                <header className="audion-journey-slide-head">
                  <div className="audion-journey-slide-head-copy">
                    <span className="audion-journey-slide-num" aria-hidden>
                      {String(n).padStart(2, '0')}
                    </span>
                    <Text role="label" className="audion-journey-slide-eyebrow">
                      Step
                      {total ? ` · ${n} of ${total}` : ''}
                    </Text>
                    <Text role="headline" as="h4" className="audion-journey-slide-title">
                      {title}
                    </Text>
                  </div>
                </header>

                {shot ? (
                  <div className="audion-journey-slide-section">
                    <Text role="label" className="audion-journey-slide-section-label">
                      Screenshot
                    </Text>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot}
                      alt={`Step ${n} screenshot`}
                      className="audion-ux-step-shot"
                    />
                  </div>
                ) : null}

                {target ? (
                  <div className="audion-journey-slide-section">
                    <Text role="label" className="audion-journey-slide-section-label">
                      Target
                    </Text>
                    <p className="audion-journey-slide-summary">{truncate(target, 200)}</p>
                  </div>
                ) : null}

                {denken ? (
                  <StepSection label="Denken">
                    <p className="audion-journey-slide-summary">{truncate(denken, 1200)}</p>
                  </StepSection>
                ) : null}

                {gesehenes ? (
                  <StepSection label="Gesehenes">
                    <p className="audion-journey-slide-summary">{truncate(gesehenes, 800)}</p>
                  </StepSection>
                ) : null}

                {wissen ? (
                  <StepSection label="Wissen">
                    <p className="audion-journey-slide-summary">{truncate(wissen, 1000)}</p>
                  </StepSection>
                ) : null}

                {nextStep ? (
                  <StepSection label="Nächster Schritt">
                    <p className="audion-journey-slide-summary">{truncate(nextStep, 600)}</p>
                  </StepSection>
                ) : null}

                {result ? (
                  <StepSection label="Ergebnis">
                    <p className="audion-journey-slide-summary">{truncate(result, 1200)}</p>
                  </StepSection>
                ) : null}

                {!shot && !target && !hasThinkAloud ? (
                  <div className="audion-journey-slide-section">
                    <Text role="label" className="audion-journey-slide-section-label">
                      Denken
                    </Text>
                    <p className="audion-journey-slide-empty-moments">No detail yet.</p>
                  </div>
                ) : null}
              </Panel>
            </article>
          )
        })}
      </div>
    </section>
  )
}
