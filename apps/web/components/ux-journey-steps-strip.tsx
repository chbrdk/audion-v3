'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import type { ChatUxJourneyStep } from '@audion-v3/contracts'
import { Panel, SectionChrome, Text } from '@msqdx/ui'
import { ChatAnswer } from '../lib/chat/chat-answer'
import {
  chatUxJourneyStepLabel,
  chatUxJourneyStepShotSrc,
} from '../lib/chat/ux-journey-steps'

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
    <details
      className="audion-journey-slide-section audion-ux-step-section"
      open={open}
      onClick={(e) => e.stopPropagation()}
    >
      <summary className="audion-ux-step-section-summary">
        <Text role="label" className="audion-journey-slide-section-label">
          {label}
        </Text>
      </summary>
      <div className="audion-ux-step-section-body">{children}</div>
    </details>
  )
}

function StepMarkdown({ text, compact }: { text: string; compact: boolean }) {
  return (
    <div
      className={
        compact
          ? 'audion-ux-step-md audion-ux-step-md--compact'
          : 'audion-ux-step-md'
      }
    >
      <ChatAnswer answer={text} />
    </div>
  )
}

/**
 * Live / finished UX journey steps — phase-card chrome + V2 think-aloud sections.
 * Click a card to select it for follow-up chat (and expand); Esc collapses expand.
 */
export function UxJourneyStepsStrip({
  steps,
  stepsTotal,
  running = false,
  selectedIndex = null,
  onSelectStep,
}: {
  steps: ChatUxJourneyStep[]
  stepsTotal?: number | null
  running?: boolean
  selectedIndex?: number | null
  onSelectStep?: (index: number | null) => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const targetIdx = expandedIdx ?? selectedIndex ?? (running ? steps.length - 1 : -1)
    if (targetIdx < 0) return
    const card = el.querySelector<HTMLElement>(`[data-step-index="${targetIdx}"]`)
    if (!card) return
    const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    }
  }, [steps.length, expandedIdx, selectedIndex, running])

  useEffect(() => {
    if (expandedIdx == null) return
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setExpandedIdx(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expandedIdx])

  useEffect(() => {
    if (selectedIndex == null) return
    if (selectedIndex < 0 || selectedIndex >= steps.length) {
      onSelectStep?.(null)
    }
  }, [selectedIndex, steps.length, onSelectStep])

  if (!steps.length) {
    return running ? (
      <p className="audion-muted audion-ux-steps-empty">Waiting for first step…</p>
    ) : null
  }

  const total = stepsTotal && stepsTotal > 0 ? stepsTotal : undefined
  const activeIdx = running ? steps.length - 1 : -1
  const meta = total ? `${steps.length} / ${total}` : `${steps.length}`

  function activateCard(idx: number) {
    onSelectStep?.(idx)
    setExpandedIdx((prev) => (prev === idx ? null : idx))
  }

  function onCardKeyDown(e: KeyboardEvent<HTMLElement>, idx: number) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    activateCard(idx)
  }

  function onCardClick(e: MouseEvent<HTMLElement>, idx: number) {
    if (typeof window !== 'undefined' && window.getSelection()?.toString()) return
    const target = e.target as HTMLElement | null
    if (target?.closest('a, button, summary, details')) return
    activateCard(idx)
  }

  return (
    <section className="audion-ux-steps" aria-label="Journey steps">
      <SectionChrome quiet title="Steps" meta={meta} metaTone="accent" as="h3" />
      <p className="audion-ux-steps-hint audion-muted">
        Select a step to keep chatting about that moment with the persona.
      </p>
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
          const expanded = expandedIdx === idx
          const selected = selectedIndex === idx
          const hasThinkAloud = Boolean(denken || gesehenes || wissen || nextStep || result)
          return (
            <article
              key={`${n}-${idx}`}
              className={[
                'audion-journey-slide',
                'audion-ux-step-slide',
                active ? 'audion-journey-slide--active' : '',
                expanded ? 'audion-ux-step-slide--expanded' : '',
                selected ? 'audion-ux-step-slide--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-step-index={idx}
              aria-current={selected ? 'true' : active ? 'step' : undefined}
              aria-expanded={expanded}
              aria-pressed={selected}
              aria-label={`${chatUxJourneyStepLabel(s, idx)}${selected ? ' (selected for chat)' : ''}${expanded ? ' (expanded)' : ''}`}
              tabIndex={0}
              onClick={(e) => onCardClick(e, idx)}
              onKeyDown={(e) => onCardKeyDown(e, idx)}
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
                      <span className="audion-ux-step-expand-hint">
                        {selected
                          ? ' · selected for chat'
                          : expanded
                            ? ' · click to collapse'
                            : ' · click to select & expand'}
                      </span>
                    </Text>
                    <Text role="headline" as="h4" className="audion-journey-slide-title">
                      {title}
                    </Text>
                  </div>
                </header>

                {shot ? (
                  <div className="audion-journey-slide-section audion-ux-step-shot-section">
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
                    <p className="audion-journey-slide-summary">
                      {expanded || target.length <= 200
                        ? target
                        : `${target.slice(0, 199)}…`}
                    </p>
                  </div>
                ) : null}

                {denken ? (
                  <StepSection label="Denken">
                    <StepMarkdown text={denken} compact={!expanded} />
                  </StepSection>
                ) : null}

                {gesehenes ? (
                  <StepSection label="Gesehenes">
                    <StepMarkdown text={gesehenes} compact={!expanded} />
                  </StepSection>
                ) : null}

                {wissen ? (
                  <StepSection label="Wissen">
                    <StepMarkdown text={wissen} compact={!expanded} />
                  </StepSection>
                ) : null}

                {nextStep ? (
                  <StepSection label="Nächster Schritt">
                    <StepMarkdown text={nextStep} compact={!expanded} />
                  </StepSection>
                ) : null}

                {result ? (
                  <StepSection label="Ergebnis">
                    <StepMarkdown text={result} compact={!expanded} />
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
