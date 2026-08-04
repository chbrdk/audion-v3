'use client'

import { memo, useCallback, type ChangeEvent, type MouseEvent } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { UxFlowGateCondition, UxFlowNode, UxFlowNodeKind } from '@audion-v3/contracts'
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
  const kind = flowNode.kind

  const patch = useCallback(
    (partial: Partial<UxFlowNode>) => {
      onUpdate?.(id, partial)
    },
    [id, onUpdate],
  )

  const onLabel = (e: ChangeEvent<HTMLInputElement>) => patch({ label: e.target.value })
  const onText = (e: ChangeEvent<HTMLTextAreaElement>) => patch({ text: e.target.value })
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

  const runBClass =
    runStateB !== 'idle' ? ` audion-flow-rf-node--run-b-${runStateB}` : ''
  const showOutput =
    Boolean(runOutput?.text || runOutput?.imageUrl || runOutput?.label) &&
    (runState === 'active' || runState === 'done' || runState === 'error')

  return (
    <div
      className={`audion-flow-rf-node audion-flow-rf-node--${kind} audion-flow-rf-node--run-${runState}${runBClass}${showOutput ? ' has-output' : ''}${selected ? ' is-selected' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="audion-flow-rf-handle audion-flow-rf-handle--in"
      />

      <header className="audion-flow-rf-node-head">
        <span className="audion-flow-rf-node-kind">{KIND_LABEL[kind]}</span>
        <span className="audion-flow-rf-node-run" data-run={runState}>
          {runState === 'idle' ? '' : runState}
        </span>
        <span className="audion-flow-rf-node-id" title={id}>
          {id}
        </span>
      </header>

      <div className="audion-flow-rf-node-body nodrag nopan" onMouseDown={stopDrag}>
        <label className="audion-flow-rf-field">
          <span>Name</span>
          <input
            className="audion-flow-rf-input"
            value={flowNode.label}
            onChange={onLabel}
            placeholder="Node name"
          />
        </label>

        {kind === 'start' ? (
          <label className="audion-flow-rf-field">
            <span>urlKey</span>
            <input
              className="audion-flow-rf-input"
              value={flowNode.urlKey ?? ''}
              onChange={onUrl}
              placeholder="url key or https://…"
            />
          </label>
        ) : null}

        {kind === 'gate' ? (
          <>
            <label className="audion-flow-rf-field">
              <span>Condition</span>
              <select
                className="audion-flow-rf-input audion-flow-rf-select"
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
              <label className="audion-flow-rf-field">
                <span>pattern</span>
                <input
                  className="audion-flow-rf-input"
                  value={flowNode.pattern ?? ''}
                  onChange={onPattern}
                  placeholder="regex"
                />
              </label>
            )}
          </>
        ) : null}

        {kind === 'observe' ? (
          <label className="audion-flow-rf-field audion-flow-rf-field--inline">
            <span>Sekunden</span>
            <input
              className="audion-flow-rf-input audion-flow-rf-input--narrow"
              type="number"
              min={1}
              value={flowNode.observeSeconds ?? 30}
              onChange={onSeconds}
            />
          </label>
        ) : null}

        {showText ? (
          <label className="audion-flow-rf-field">
            <span>{kind === 'measure' ? 'Frage' : 'Text'}</span>
            <textarea
              className="audion-flow-rf-input audion-flow-rf-textarea"
              rows={kind === 'observe' ? 2 : 3}
              value={flowNode.text ?? ''}
              onChange={onText}
              placeholder="Instruction / question…"
            />
          </label>
        ) : null}

        {showOutput ? (
          <div className="audion-flow-rf-output">
            <p className="audion-flow-rf-output-label">
              Output
              {runOutput?.step != null ? ` · #${runOutput.step}` : ''}
            </p>
            {runOutput?.label ? (
              <p className="audion-flow-rf-output-headline">{runOutput.label}</p>
            ) : null}
            {runOutput?.text ? (
              <pre className="audion-flow-rf-output-text">{runOutput.text}</pre>
            ) : null}
            {runOutput?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="audion-flow-rf-output-img"
                src={runOutput.imageUrl}
                alt={runOutput.label ? `Screenshot: ${runOutput.label}` : 'Step screenshot'}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      {kind === 'gate' ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="when"
            className="audion-flow-rf-handle audion-flow-rf-handle--when"
            style={{ top: '38%' }}
            title="wenn"
          />
          <span className="audion-flow-rf-port-label audion-flow-rf-port-label--when">wenn</span>
          <Handle
            type="source"
            position={Position.Right}
            id="otherwise"
            className="audion-flow-rf-handle audion-flow-rf-handle--otherwise"
            style={{ top: '72%' }}
            title="sonst"
          />
          <span className="audion-flow-rf-port-label audion-flow-rf-port-label--otherwise">
            sonst
          </span>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          id="then"
          className="audion-flow-rf-handle audion-flow-rf-handle--out"
        />
      )}
    </div>
  )
}

export const UxFlowRfNode = memo(UxFlowRfNodeInner)
