'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { UxFlowNode } from '@audion-v3/contracts'
import { Button, FlowInspectorShell, type FlowInspectorSection } from '@msqdx/ui'
import type {
  FlowJobRunSummary,
  FlowNodeInspectorData,
  FlowNodeInspectorStep,
  FlowNodeRunState,
} from '../lib/ux-flow-run-progress'
import { useT } from '../lib/user-prefs'

function formatSec(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  if (sec < 60) return `${sec.toFixed(1)}s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

function formatJson(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') return value.trim() || null
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function thinkAloudText(value: Record<string, unknown> | null | undefined): string | null {
  if (!value) return null
  if (typeof value.now === 'string' && value.now.trim()) return value.now.trim()
  const parts: string[] = []
  for (const [k, v] of Object.entries(value)) {
    if (v == null || v === '') continue
    parts.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
  }
  return parts.length ? parts.join('\n') : formatJson(value)
}

function perceptionRows(
  value: Record<string, unknown> | null | undefined,
): Array<{ key: string; value: string }> {
  if (!value) return []
  const rows: Array<{ key: string; value: string }> = []
  for (const [k, v] of Object.entries(value)) {
    if (v == null) continue
    rows.push({
      key: k,
      value: typeof v === 'string' ? v : formatJson(v) ?? String(v),
    })
  }
  return rows
}

function InspectorField({
  label,
  tone,
  children,
  mono,
}: {
  label: string
  tone: 'action' | 'target' | 'result' | 'reasoning' | 'think' | 'perception' | 'meta' | 'error'
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className={`msqdx-flow-inspector-field msqdx-flow-inspector-field--${tone}`}>
      <span className="msqdx-flow-inspector-field-label">{label}</span>
      <div
        className={`msqdx-flow-inspector-field-value${mono ? ' msqdx-flow-inspector-field-value--mono' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}

function InspectorStepCard({
  step,
  index,
  isLast,
  defaultOpen,
}: {
  step: FlowNodeInspectorStep
  index: number
  isLast: boolean
  defaultOpen: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  const think = thinkAloudText(step.thinkAloud)
  const perception = perceptionRows(step.perception)
  const meta = step.reasoningMeta
  const actionLabel = step.action ?? 'step'
  const summary = step.target?.trim() || step.result?.trim()?.slice(0, 48) || '—'

  return (
    <li className={`msqdx-flow-inspector-step-item${isLast ? ' is-latest' : ''}`}>
      <article className="msqdx-flow-inspector-step">
        <button
          type="button"
          className="msqdx-flow-inspector-step-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="msqdx-flow-inspector-step-num">#{step.step ?? index + 1}</span>
          <span
            className={`msqdx-flow-inspector-action-badge msqdx-flow-inspector-action-badge--${actionTone(actionLabel)}`}
          >
            {actionLabel}
          </span>
          <span className="msqdx-flow-inspector-step-summary" title={summary}>
            {summary}
          </span>
          <span className="msqdx-flow-inspector-step-timing">{formatSec(step.deltaSec)}</span>
          <span className="msqdx-flow-inspector-chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </button>

        {open ? (
          <div className="msqdx-flow-inspector-step-body">
            <div className="msqdx-flow-inspector-step-meta-row">
              <span>{step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : '—'}</span>
              <span>+{formatSec(step.elapsedSinceStartSec)}</span>
            </div>

            {step.action ? (
              <InspectorField label={t('inspector.action')} tone="action">
                {step.action}
              </InspectorField>
            ) : null}

            {step.target ? (
              <InspectorField label={t('inspector.target')} tone="target" mono>
                {step.target}
              </InspectorField>
            ) : null}

            {step.result ? (
              <InspectorField label={t('inspector.result')} tone="result">
                <pre className="msqdx-flow-inspector-pre">{step.result}</pre>
              </InspectorField>
            ) : null}

            {step.reasoning ? (
              <InspectorField label={t('inspector.reasoning')} tone="reasoning">
                <pre className="msqdx-flow-inspector-pre">{step.reasoning}</pre>
              </InspectorField>
            ) : null}

            {think ? (
              <InspectorField label={t('inspector.thinkAloud')} tone="think">
                <pre className="msqdx-flow-inspector-pre">{think}</pre>
              </InspectorField>
            ) : null}

            {perception.length ? (
              <div className="msqdx-flow-inspector-field-group">
                <span className="msqdx-flow-inspector-field-group-label">
                  {t('inspector.perception')}
                </span>
                {perception.map((row) => (
                  <InspectorField key={row.key} label={row.key} tone="perception">
                    <pre className="msqdx-flow-inspector-pre">{row.value}</pre>
                  </InspectorField>
                ))}
              </div>
            ) : null}

            {meta?.memory ? (
              <InspectorField label={t('inspector.memory')} tone="meta">
                <pre className="msqdx-flow-inspector-pre">{meta.memory}</pre>
              </InspectorField>
            ) : null}
            {meta?.next_goal ? (
              <InspectorField label={t('inspector.nextGoal')} tone="meta">
                <pre className="msqdx-flow-inspector-pre">{meta.next_goal}</pre>
              </InspectorField>
            ) : null}
            {meta?.evaluation_previous_goal ? (
              <InspectorField label="Prev goal eval" tone="meta">
                <pre className="msqdx-flow-inspector-pre">{meta.evaluation_previous_goal}</pre>
              </InspectorField>
            ) : null}

            {step.imageUrl ? (
              <InspectorField label="Screenshot" tone="meta">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="msqdx-flow-inspector-shot"
                  src={step.imageUrl}
                  alt={`Screenshot step ${step.step ?? ''}`}
                />
              </InspectorField>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  )
}

function actionTone(action: string): string {
  const a = action.toLowerCase()
  if (a.includes('click') || a.includes('tap')) return 'click'
  if (a.includes('type') || a.includes('input') || a.includes('fill')) return 'type'
  if (a.includes('nav') || a.includes('goto') || a.includes('open')) return 'nav'
  if (a.includes('scroll')) return 'scroll'
  if (a.includes('wait') || a.includes('observe')) return 'wait'
  return 'default'
}

export function UxFlowNodeInspector({
  node,
  runState,
  inspector,
  jobSummary,
  onClose,
  onAppendOutputToNote,
}: {
  node: UxFlowNode
  runState: FlowNodeRunState
  inspector?: FlowNodeInspectorData | null
  jobSummary?: FlowJobRunSummary | null
  onClose: () => void
  onAppendOutputToNote?: () => void
}) {
  const t = useT()
  const steps = inspector?.steps ?? []
  const [expandedLatest, setExpandedLatest] = useState(true)

  useEffect(() => {
    setExpandedLatest(true)
  }, [node.id, steps.length])

  const nodeElapsed = useMemo(() => {
    if (steps.length >= 2) {
      return (
        (steps[steps.length - 1]?.elapsedSinceStartSec ?? 0) -
        (steps[0]?.elapsedSinceStartSec ?? 0)
      )
    }
    return steps[0]?.deltaSec ?? null
  }, [steps])

  const lastStep = steps.length ? steps[steps.length - 1] : null
  const canAppend =
    Boolean(onAppendOutputToNote) &&
    Boolean(lastStep?.result || lastStep?.reasoning || lastStep?.thinkAloud)

  const sections = useMemo((): FlowInspectorSection[] => {
    const next: FlowInspectorSection[] = []

    if (node.text || node.note) {
      next.push({
        id: 'design',
        title: t('inspector.design'),
        defaultOpen: false,
        children: (
          <>
            {node.text ? (
              <InspectorField label="Text" tone="meta">
                <pre className="msqdx-flow-inspector-pre">{node.text}</pre>
              </InspectorField>
            ) : null}
            {node.note ? (
              <InspectorField label="Note" tone="meta">
                <pre className="msqdx-flow-inspector-pre">{node.note}</pre>
              </InspectorField>
            ) : null}
          </>
        ),
      })
    }

    if (jobSummary) {
      next.push({
        id: 'run',
        title: t('inspector.run'),
        defaultOpen: true,
        meta: (
          <span className="msqdx-flow-inspector-pill">
            {jobSummary.status ?? '—'} · {formatSec(jobSummary.elapsedSeconds)}
          </span>
        ),
        children: (
          <>
            <div className="msqdx-flow-inspector-stats">
              <div className="msqdx-flow-inspector-stat">
                <span>Status</span>
                <strong>{jobSummary.status ?? '—'}</strong>
              </div>
              <div className="msqdx-flow-inspector-stat">
                <span>Steps</span>
                <strong>{jobSummary.stepCount}</strong>
              </div>
              <div className="msqdx-flow-inspector-stat">
                <span>Dauer</span>
                <strong>{formatSec(jobSummary.elapsedSeconds)}</strong>
              </div>
            </div>
            {jobSummary.jobId ? (
              <InspectorField label="Job ID" tone="meta" mono>
                {jobSummary.jobId}
              </InspectorField>
            ) : null}
            {jobSummary.finalUrl ? (
              <InspectorField label="Final URL" tone="target" mono>
                {jobSummary.finalUrl}
              </InspectorField>
            ) : null}
            {jobSummary.error ? (
              <InspectorField label="Error" tone="error">
                {jobSummary.error}
              </InspectorField>
            ) : null}
          </>
        ),
      })
    }

    if (steps.length) {
      next.push({
        id: 'execution',
        title: t('inspector.execution'),
        defaultOpen: true,
        meta: (
          <span className="msqdx-flow-inspector-pill">
            {steps.length} steps · {formatSec(nodeElapsed)}
          </span>
        ),
        children: (
          <>
            {canAppend ? (
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="msqdx-flow-inspector-append"
                onClick={onAppendOutputToNote}
              >
                Letzten Output → Note
              </Button>
            ) : null}
            <ol className="msqdx-flow-inspector-steps">
              {steps.map((s, i) => (
                <InspectorStepCard
                  key={`${s.step ?? i}-${s.timestamp ?? i}`}
                  step={s}
                  index={i}
                  isLast={i === steps.length - 1}
                  defaultOpen={i === steps.length - 1 && expandedLatest}
                />
              ))}
            </ol>
          </>
        ),
      })
    } else {
      next.push({
        id: 'execution',
        title: t('inspector.execution'),
        defaultOpen: true,
        children: (
          <p className="msqdx-flow-inspector-empty">
            Noch keine Steps auf dieser Node — Testen oder Agent-Segment starten.
          </p>
        ),
      })
    }

    if (node.kind === 'gate' && (inspector?.gateEvaluation || inspector?.replanEvents?.length)) {
      next.push({
        id: 'gate',
        title: t('inspector.gate'),
        defaultOpen: true,
        children: (
          <>
            {inspector.gateEvaluation ? (
              <div
                className={`msqdx-flow-inspector-gate-card${
                  inspector.gateEvaluation.matched ? ' is-match' : ' is-miss'
                }`}
              >
                <span className="msqdx-flow-inspector-gate-verdict">
                  {inspector.gateEvaluation.matched ? t('inspector.match') : 'Kein Match'}
                </span>
                {inspector.gateEvaluation.condition ? (
                  <InspectorField label="Condition" tone="meta" mono>
                    {inspector.gateEvaluation.condition}
                  </InspectorField>
                ) : null}
                {inspector.gateEvaluation.evidence ? (
                  <InspectorField label="Evidence" tone="result">
                    {inspector.gateEvaluation.evidence}
                  </InspectorField>
                ) : null}
              </div>
            ) : null}
            {inspector.replanEvents?.length ? (
              <ul className="msqdx-flow-inspector-replans">
                {inspector.replanEvents.map((ev, i) => (
                  <li
                    key={`${ev.gateNodeId}-${i}`}
                    className={`msqdx-flow-inspector-replan msqdx-flow-inspector-replan--${ev.edgeKind ?? 'replan'}`}
                  >
                    <span className="msqdx-flow-inspector-replan-kind">
                      {ev.edgeKind ?? 'replan'}
                    </span>
                    {ev.remainingTask ? (
                      <pre className="msqdx-flow-inspector-pre">{ev.remainingTask}</pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ),
      })
    }

    return next
  }, [
    canAppend,
    expandedLatest,
    inspector,
    jobSummary,
    node.kind,
    node.note,
    node.text,
    nodeElapsed,
    onAppendOutputToNote,
    steps,
    t,
  ])

  return (
    <FlowInspectorShell
      kind={node.kind}
      kindLabel={t(`inspector.kinds.${node.kind}`)}
      title={node.label || node.id}
      nodeId={node.id}
      runState={runState}
      onClose={onClose}
      sections={sections}
      aria-label={t('flows.inspector')}
    />
  )
}
