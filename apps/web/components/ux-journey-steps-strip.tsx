'use client'

import { useEffect, useState, type ReactNode } from 'react'
import type { ChatUxJourneyStep } from '@audion-v3/contracts'
import {
  ChannelLane,
  ChannelStack,
  Panel,
  SectionChrome,
  StepStrip,
  StepStripItem,
  Text,
} from '@msqdx/ui'
import { ChatAnswer } from '../lib/chat/chat-answer'
import {
  chatUxJourneyStepLabel,
  chatUxJourneyStepShotSrc,
  isUselessPersonaStub,
  synthesizeThinkAloudFallback,
} from '../lib/chat/ux-journey-steps'

/** Compact cards always surface these when content exists (persona moment). */
const PERSONA_MOMENT_KEYS = new Set(['seen', 'think', 'next', 'why', 'feel'])

/** Expand-only secondary bookkeeping / outcome channels. */
const EXPAND_ONLY_KEYS = new Set(['prior', 'learned', 'result'])

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

function usableChannelText(text: string | null | undefined): string {
  const t = text?.trim() || ''
  if (!t || isUselessPersonaStub(t)) return ''
  return t
}

/**
 * Live / finished UX journey steps — product think-aloud on DS StepStrip / ChannelStack.
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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

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
      <StepStrip
        className="audion-ux-steps"
        aria-label="Journey steps"
        empty={<span className="audion-muted">Waiting for first step…</span>}
      />
    ) : null
  }

  const total = stepsTotal && stepsTotal > 0 ? stepsTotal : undefined
  const activeIdx = running ? steps.length - 1 : -1
  const meta = total ? `${steps.length} / ${total}` : `${steps.length}`
  const scrollToIndex = expandedIdx ?? selectedIndex ?? (running ? steps.length - 1 : null)

  function activateCard(idx: number) {
    onSelectStep?.(idx)
    setExpandedIdx((prev) => (prev === idx ? null : idx))
  }

  return (
    <StepStrip
      className="audion-ux-steps"
      aria-label="Journey steps"
      scrollToIndex={scrollToIndex}
      header={<SectionChrome quiet title="Steps" meta={meta} metaTone="accent" as="h3" />}
      hint="Select a step to keep chatting about that moment with the persona."
    >
      {steps.map((s, idx) => {
        const n = s.step ?? idx + 1
        const shot = chatUxJourneyStepShotSrc(s)
        const ta = s.thinkAloud ?? synthesizeThinkAloudFallback(s)
        const gesehenes = usableChannelText(ta.seen)
        const denken = usableChannelText(ta.think) || usableChannelText(s.reasoning)
        const priorKnow = usableChannelText(ta.priorKnow)
        const learned = usableChannelText(ta.learned)
        const nextStep = usableChannelText(ta.next)
        const why = usableChannelText(ta.why)
        const feel = ta.feel
        const result = s.result?.trim() || ''
        const target = s.target?.trim() || ''
        const observations = expandedIdx === idx ? s.observations ?? [] : []
        const title = actionLabel(s.action)
        const active = idx === activeIdx
        const expanded = expandedIdx === idx
        const selected = selectedIndex === idx
        const hasThinkAloud = Boolean(
          gesehenes || denken || priorKnow || learned || nextStep || why || feel || result,
        )

        const lanes: Array<{ key: string; label: string; body: ReactNode; open: boolean }> = []
        if (gesehenes) {
          lanes.push({
            key: 'seen',
            label: 'Gesehenes',
            open: true,
            body: <StepMarkdown text={gesehenes} compact={!expanded} />,
          })
        }
        if (denken) {
          lanes.push({
            key: 'think',
            label: 'Denken',
            open: true,
            body: <StepMarkdown text={denken} compact={!expanded} />,
          })
        }
        if (priorKnow) {
          lanes.push({
            key: 'prior',
            label: 'Schon gewusst',
            open: expanded,
            body: <StepMarkdown text={priorKnow} compact={!expanded} />,
          })
        }
        if (learned) {
          lanes.push({
            key: 'learned',
            label: 'Neu gelernt',
            open: expanded,
            body: <StepMarkdown text={learned} compact={!expanded} />,
          })
        }
        if (nextStep) {
          lanes.push({
            key: 'next',
            label: 'Nächster Schritt',
            open: true,
            body: <StepMarkdown text={nextStep} compact={!expanded} />,
          })
        }
        if (why) {
          lanes.push({
            key: 'why',
            label: 'Warum',
            open: true,
            body: <StepMarkdown text={why} compact={!expanded} />,
          })
        }
        if (feel?.label) {
          lanes.push({
            key: 'feel',
            label: 'Gefühl',
            open: true,
            body: (
              <p className="audion-journey-slide-summary">
                {feel.label}
                {typeof feel.valence === 'number' ? ` · valence ${feel.valence}` : ''}
              </p>
            ),
          })
        }
        if (result) {
          lanes.push({
            key: 'result',
            label: 'Ergebnis',
            open: expanded,
            body: <StepMarkdown text={result} compact={!expanded} />,
          })
        }

        // Compact: persona moment open; secondary only when expanded. Never empty labels.
        const visibleLanes = lanes.filter((lane) => {
          if (expanded) return true
          if (EXPAND_ONLY_KEYS.has(lane.key)) return false
          return PERSONA_MOMENT_KEYS.has(lane.key)
        })

        return (
          <StepStripItem
            key={`${n}-${idx}`}
            index={idx}
            className={[
              'audion-journey-slide',
              'audion-ux-step-slide',
              active ? 'audion-journey-slide--active' : '',
              expanded ? 'audion-ux-step-slide--expanded' : '',
              selected ? 'audion-ux-step-slide--selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            selected={selected}
            expanded={expanded}
            active={active}
            label={`${chatUxJourneyStepLabel(s, idx)}${selected ? ' (selected for chat)' : ''}${expanded ? ' (expanded)' : ''}`}
            onActivate={() => activateCard(idx)}
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
                    {feel?.label ? (
                      <span
                        className={[
                          'audion-ux-step-feel-pill',
                          feel.valence < 0
                            ? 'is-negative'
                            : feel.valence > 0
                              ? 'is-positive'
                              : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {' '}
                        · {feel.label}
                      </span>
                    ) : null}
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
                    {expanded || target.length <= 90
                      ? target
                      : `${target.slice(0, 89)}…`}
                  </p>
                </div>
              ) : null}

              {visibleLanes.length ? (
                <ChannelStack
                  className="audion-ux-step-channels audion-ux-step-channels--persona-moment"
                  aria-label="Think aloud"
                >
                  {visibleLanes.map((lane) => (
                    <ChannelLane
                      key={lane.key}
                      className="audion-journey-slide-section audion-ux-step-section"
                      label={
                        <Text role="label" className="audion-journey-slide-section-label">
                          {lane.label}
                        </Text>
                      }
                      open={lane.open || expanded}
                      compact={!expanded}
                    >
                      {lane.body}
                    </ChannelLane>
                  ))}
                </ChannelStack>
              ) : null}

              {observations.length ? (
                <div className="audion-journey-slide-section audion-ux-step-obs">
                  <Text role="label" className="audion-journey-slide-section-label">
                    Observations
                  </Text>
                  <ul className="audion-ux-step-obs-list">
                    {observations.map((o, oi) => (
                      <li
                        key={`${o.category}-${oi}`}
                        className={[
                          'audion-ux-step-obs-chip',
                          o.polarity < 0 ? 'is-negative' : o.polarity > 0 ? 'is-positive' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <span className="audion-ux-step-obs-cat">{o.category}</span>
                        <span>{o.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
          </StepStripItem>
        )
      })}
    </StepStrip>
  )
}
