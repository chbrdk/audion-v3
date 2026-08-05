'use client'

import { memo, useCallback, type ChangeEvent, type MouseEvent } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { UxFlowGateCondition, UxFlowNode, UxFlowNodeKind } from '@audion-v3/contracts'
import { Button, FlowNodeCard, Input, Textarea } from '@msqdx/ui'
import { UX_FLOW_GATE_OPTIONS, type UxFlowRfNodeData } from '../lib/ux-flow-canvas'

type UxFlowNodeType = Node<UxFlowRfNodeData, 'uxFlow'>

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

function stopDrag(e: MouseEvent) {
  e.stopPropagation()
}

function UxFlowRfNodeInner({ id, data, selected }: NodeProps<UxFlowNodeType>) {
  const flowNode = data.flowNode
  const onUpdate = data.onUpdate
  const runState = data.runState ?? 'idle'
  const runStateB = data.runStateB ?? 'idle'
  const runOutput = data.runOutput
  const gateEvaluation = data.gateEvaluation
  const runBusy = data.runBusy ?? false
  const onManualGate = data.onManualGate
  const onPlaySegment = data.onPlaySegment
  const onOutputToNote = data.onOutputToNote
  const onOpenInspector = data.onOpenInspector
  const kind = flowNode.kind

  const patch = useCallback(
    (partial: Partial<UxFlowNode>) => {
      onUpdate?.(id, partial)
    },
    [id, onUpdate],
  )

  const onLabel = (e: ChangeEvent<HTMLInputElement>) => patch({ label: e.target.value })
  const onText = (e: ChangeEvent<HTMLTextAreaElement>) => patch({ text: e.target.value })
  const onNote = (e: ChangeEvent<HTMLTextAreaElement>) => patch({ note: e.target.value })
  const onUrl = (e: ChangeEvent<HTMLInputElement>) => patch({ urlKey: e.target.value })
  const onPattern = (e: ChangeEvent<HTMLInputElement>) => patch({ pattern: e.target.value })
  const onSeconds = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value)
    patch({ observeSeconds: Number.isFinite(n) ? n : null })
  }
  const onGate = (e: ChangeEvent<HTMLSelectElement>) =>
    patch({ gateCondition: e.target.value as UxFlowGateCondition })

  const showText =
    kind === 'prompt' ||
    kind === 'action' ||
    kind === 'message' ||
    kind === 'abandon' ||
    kind === 'success' ||
    kind === 'measure' ||
    kind === 'observe'

  const showOutput =
    Boolean(runOutput?.text || runOutput?.imageUrl || runOutput?.label) &&
    (runState === 'active' || runState === 'done' || runState === 'error')

  const showSegmentPlay =
    onPlaySegment &&
    (kind === 'action' || kind === 'observe' || kind === 'prompt' || kind === 'message')

  return (
    <FlowNodeCard
      kind={kind}
      kindLabel={KIND_LABEL[kind]}
      nodeId={id}
      selected={selected}
      runState={runState}
      runStateB={runStateB}
      hasOutput={showOutput}
      targetHandle={
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="msqdx-flow-rf-handle msqdx-flow-rf-handle--in"
        />
      }
      sourceHandles={
        kind === 'gate' ? (
          <>
            <Handle
              type="source"
              position={Position.Right}
              id="when"
              className="msqdx-flow-rf-handle msqdx-flow-rf-handle--when"
              style={{ top: '38%' }}
              title="wenn"
            />
            <span className="msqdx-flow-rf-port-label msqdx-flow-rf-port-label--when">wenn</span>
            <Handle
              type="source"
              position={Position.Right}
              id="otherwise"
              className="msqdx-flow-rf-handle msqdx-flow-rf-handle--otherwise"
              style={{ top: '72%' }}
              title="sonst"
            />
            <span className="msqdx-flow-rf-port-label msqdx-flow-rf-port-label--otherwise">
              sonst
            </span>
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Right}
            id="then"
            className="msqdx-flow-rf-handle msqdx-flow-rf-handle--out"
          />
        )
      }
      output={
        showOutput ? (
          <>
            <p className="msqdx-flow-rf-output-label">
              Output
              {runOutput?.step != null ? ` · #${runOutput.step}` : ''}
            </p>
            {runOutput?.label ? (
              <p className="msqdx-flow-rf-output-headline">{runOutput.label}</p>
            ) : null}
            {runOutput?.text ? (
              <pre className="msqdx-flow-rf-output-text">{runOutput.text}</pre>
            ) : null}
            {runOutput?.text && onOutputToNote ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onOutputToNote()}>
                In Note übernehmen
              </Button>
            ) : null}
            {runOutput?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="msqdx-flow-rf-output-img"
                src={runOutput.imageUrl}
                alt={runOutput.label ? `Screenshot: ${runOutput.label}` : 'Step screenshot'}
              />
            ) : null}
          </>
        ) : undefined
      }
    >
      <div className="nodrag nopan" onMouseDown={stopDrag}>
        <label className="msqdx-flow-rf-field">
          <span>Name</span>
          <Input
            block
            size="sm"
            className="msqdx-flow-rf-ds-input"
            value={flowNode.label}
            onChange={onLabel}
            placeholder="Node name"
          />
        </label>

        {kind === 'start' ? (
          <label className="msqdx-flow-rf-field">
            <span>urlKey</span>
            <Input
              block
              size="sm"
              className="msqdx-flow-rf-ds-input"
              value={flowNode.urlKey ?? ''}
              onChange={onUrl}
              placeholder="url key or https://…"
            />
          </label>
        ) : null}

        {kind === 'gate' ? (
          <>
            <label className="msqdx-flow-rf-field">
              <span>Condition</span>
              <select
                className="msqdx-flow-rf-select"
                value={flowNode.gateCondition ?? 'goal_reached'}
                onChange={onGate}
              >
                {UX_FLOW_GATE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
            {(flowNode.gateCondition === 'url_match' ||
              flowNode.gateCondition === 'title_match') && (
              <label className="msqdx-flow-rf-field">
                <span>pattern</span>
                <Input
                  block
                  size="sm"
                  className="msqdx-flow-rf-ds-input"
                  value={flowNode.pattern ?? ''}
                  onChange={onPattern}
                  placeholder="regex"
                />
              </label>
            )}
            {gateEvaluation ? (
              <p className="msqdx-flow-rf-gate-evidence">
                Live: {gateEvaluation.matched ? 'match' : '—'}
                {gateEvaluation.evidence ? ` · ${gateEvaluation.evidence}` : ''}
              </p>
            ) : null}
            {runBusy && onManualGate ? (
              <div className="msqdx-flow-rf-gate-actions nodrag nopan" onMouseDown={stopDrag}>
                <Button type="button" size="sm" variant="subtle" onClick={() => onManualGate('when')}>
                  Wenn → Agent
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onManualGate('otherwise')}
                >
                  Sonst → Agent
                </Button>
              </div>
            ) : null}
          </>
        ) : null}

        {kind === 'observe' ? (
          <label className="msqdx-flow-rf-field msqdx-flow-rf-field--inline">
            <span>Sekunden</span>
            <Input
              size="sm"
              className="msqdx-flow-rf-ds-input msqdx-flow-rf-input--narrow"
              type="number"
              min={1}
              value={flowNode.observeSeconds ?? 30}
              onChange={onSeconds}
            />
          </label>
        ) : null}

        {showText ? (
          <label className="msqdx-flow-rf-field">
            <span>{kind === 'measure' ? 'Frage' : 'Text'}</span>
            <Textarea
              block
              size="sm"
              className="msqdx-flow-rf-ds-input"
              rows={kind === 'observe' ? 2 : 3}
              value={flowNode.text ?? ''}
              onChange={onText}
              placeholder="Instruction / question…"
            />
          </label>
        ) : null}

        <label className="msqdx-flow-rf-field">
          <span>Note</span>
          <Textarea
            block
            size="sm"
            className="msqdx-flow-rf-ds-input msqdx-flow-rf-textarea--note"
            rows={2}
            value={flowNode.note ?? ''}
            onChange={onNote}
            onFocus={() => onOpenInspector?.()}
            placeholder="Annotation / Beobachtung…"
          />
        </label>

        {showSegmentPlay ? (
          <div className="msqdx-flow-rf-segment nodrag nopan" onMouseDown={stopDrag}>
            <Button
              type="button"
              size="sm"
              variant="subtle"
              disabled={runBusy}
              onClick={() => onPlaySegment?.()}
            >
              Agent-Segment
            </Button>
          </div>
        ) : null}
      </div>
    </FlowNodeCard>
  )
}

export const UxFlowRfNode = memo(UxFlowRfNodeInner)
