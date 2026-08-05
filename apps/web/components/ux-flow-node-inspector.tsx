'use client'

import type { UxFlowNode, UxFlowNodeKind } from '@audion-v3/contracts'
import { Button, Chip, Text } from '@msqdx/ui'
import type {
  FlowJobRunSummary,
  FlowNodeInspectorData,
  FlowNodeInspectorStep,
  FlowNodeRunState,
} from '../lib/ux-flow-run-progress'

const KIND_LABEL: Record<UxFlowNodeKind, string> = {
  start: 'Start',
  prompt: 'Prompt',
  observe: 'Observe',
  action: 'Action',
  gate: 'Gate',
  message: 'Message',
  success: 'Success',
  abandon: 'Abandon',
  measure: 'Measure',
}

function formatSec(sec?: number | null): string {
  if (sec == null || !Number.isFinite(sec)) return '—'
  if (sec < 60) return `${sec.toFixed(1)} s`
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m} m ${s} s`
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

function InspectorStepCard({ step }: { step: FlowNodeInspectorStep }) {
  const think = formatJson(step.thinkAloud)
  const perception = formatJson(step.perception)
  const meta = step.reasoningMeta
  return (
    <article className="audion-flow-inspector-step">
      <header className="audion-flow-inspector-step-head">
        <span className="audion-flow-inspector-step-num">
          #{step.step ?? '?'}
        </span>
        <span className="audion-flow-inspector-step-timing">
          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : '—'}
          {' · '}
          +{formatSec(step.elapsedSinceStartSec)}
          {step.deltaSec != null ? ` (Δ ${formatSec(step.deltaSec)})` : ''}
        </span>
      </header>
      {step.action ? (
        <p className="audion-flow-inspector-kv">
          <span>Action</span>
          <strong>{step.action}</strong>
        </p>
      ) : null}
      {step.target ? (
        <p className="audion-flow-inspector-kv">
          <span>Target</span>
          <code>{step.target}</code>
        </p>
      ) : null}
      {step.result ? (
        <p className="audion-flow-inspector-block">
          <span>Result</span>
          <pre>{step.result}</pre>
        </p>
      ) : null}
      {step.reasoning ? (
        <p className="audion-flow-inspector-block">
          <span>Reasoning</span>
          <pre>{step.reasoning}</pre>
        </p>
      ) : null}
      {think ? (
        <p className="audion-flow-inspector-block">
          <span>Think aloud</span>
          <pre>{think}</pre>
        </p>
      ) : null}
      {perception ? (
        <p className="audion-flow-inspector-block">
          <span>Perception</span>
          <pre>{perception}</pre>
        </p>
      ) : null}
      {meta && Object.keys(meta).length > 0 ? (
        <p className="audion-flow-inspector-block">
          <span>Reasoning meta</span>
          <pre>{formatJson(meta)}</pre>
        </p>
      ) : null}
      {step.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="audion-flow-inspector-shot"
          src={step.imageUrl}
          alt={`Screenshot step ${step.step ?? ''}`}
        />
      ) : null}
    </article>
  )
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
  const steps = inspector?.steps ?? []
  const nodeElapsed =
    steps.length >= 2
      ? (steps[steps.length - 1]?.elapsedSinceStartSec ?? 0) -
        (steps[0]?.elapsedSinceStartSec ?? 0)
      : steps[0]?.deltaSec ?? null

  const lastStep = steps.length ? steps[steps.length - 1] : null
  const canAppend =
    Boolean(onAppendOutputToNote) &&
    Boolean(lastStep?.result || lastStep?.reasoning || lastStep?.thinkAloud)

  return (
    <div className="audion-flow-inspector-body" aria-label="Node Inspector">
        <header className="audion-flow-inspector-head">
          <div>
            <Text role="meta" as="p" className="audion-flow-inspector-meta">
              <Chip size="sm" static>{KIND_LABEL[node.kind]}</Chip>
              <Chip size="sm" static>{runState}</Chip>
            </Text>
            <Text role="headline" as="h2" className="audion-flow-inspector-title">
              {node.label || node.id}
            </Text>
            <p className="audion-flow-inspector-id">{node.id}</p>
          </div>
          <Button type="button" size="sm" variant="subtle" onClick={onClose}>
            Schließen
          </Button>
        </header>

        {node.text ? (
          <section className="audion-flow-inspector-section">
            <Text role="label" as="h3">Design-Text</Text>
            <p className="audion-flow-inspector-prose">{node.text}</p>
          </section>
        ) : null}

        {node.note ? (
          <section className="audion-flow-inspector-section">
            <Text role="label" as="h3">Note</Text>
            <p className="audion-flow-inspector-prose">{node.note}</p>
          </section>
        ) : null}

        {jobSummary ? (
          <section className="audion-flow-inspector-section">
            <Text role="label" as="h3">Job</Text>
            <ul className="audion-flow-inspector-metrics">
              <li>
                <span>Status</span>
                <strong>{jobSummary.status ?? '—'}</strong>
              </li>
              <li>
                <span>Steps gesamt</span>
                <strong>{jobSummary.stepCount}</strong>
              </li>
              <li>
                <span>Dauer (Job)</span>
                <strong>{formatSec(jobSummary.elapsedSeconds)}</strong>
              </li>
              {jobSummary.jobId ? (
                <li>
                  <span>Job</span>
                  <code>{jobSummary.jobId}</code>
                </li>
              ) : null}
              {jobSummary.finalUrl ? (
                <li>
                  <span>Final URL</span>
                  <code>{jobSummary.finalUrl}</code>
                </li>
              ) : null}
              {jobSummary.error ? (
                <li className="audion-flow-inspector-error">
                  <span>Error</span>
                  <strong>{jobSummary.error}</strong>
                </li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {steps.length ? (
          <section className="audion-flow-inspector-section">
            <Text role="label" as="h3">
              Agent auf dieser Node ({steps.length} Steps · {formatSec(nodeElapsed)})
            </Text>
            {canAppend ? (
              <Button
                type="button"
                size="sm"
                variant="subtle"
                className="audion-flow-inspector-append"
                onClick={onAppendOutputToNote}
              >
                Letzten Output → Note
              </Button>
            ) : null}
            <ol className="audion-flow-inspector-steps">
              {steps.map((s, i) => (
                <li key={`${s.step ?? i}-${s.timestamp ?? i}`}>
                  <InspectorStepCard step={s} />
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="audion-flow-inspector-section">
            <Text role="label" as="h3">Agent-Output</Text>
            <p className="audion-flow-inspector-empty">
              Noch keine Steps auf dieser Node — Testen oder Agent-Segment starten.
            </p>
          </section>
        )}

        {node.kind === 'gate' && (inspector?.gateEvaluation || inspector?.replanEvents?.length) ? (
          <section className="audion-flow-inspector-section">
            <Text role="label" as="h3">Gate</Text>
            {inspector.gateEvaluation ? (
              <p className="audion-flow-inspector-prose">
                {inspector.gateEvaluation.matched ? 'Match' : 'Kein Match'}
                {inspector.gateEvaluation.evidence
                  ? ` · ${inspector.gateEvaluation.evidence}`
                  : ''}
                {inspector.gateEvaluation.condition
                  ? ` · ${inspector.gateEvaluation.condition}`
                  : ''}
              </p>
            ) : null}
            {inspector.replanEvents?.length ? (
              <ul className="audion-flow-inspector-replans">
                {inspector.replanEvents.map((ev, i) => (
                  <li key={`${ev.gateNodeId}-${i}`}>
                    <strong>{ev.edgeKind ?? 'replan'}</strong>
                    {ev.remainingTask ? (
                      <pre className="audion-flow-inspector-replan-task">{ev.remainingTask}</pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
    </div>
  )
}
