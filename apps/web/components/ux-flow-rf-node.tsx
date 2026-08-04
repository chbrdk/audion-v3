'use client'

import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Chip } from '@msqdx/ui'
import type { UxFlowRfNodeData } from '../lib/ux-flow-canvas'

function truncate(text: string | null | undefined, max = 72): string {
  if (!text) return ''
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

type UxFlowNodeType = Node<UxFlowRfNodeData, 'uxFlow'>

function UxFlowRfNodeInner({ data, selected }: NodeProps<UxFlowNodeType>) {
  const flowNode = data.flowNode
  return (
    <div className={`audion-flow-rf-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="audion-flow-rf-handle" />
      <p className="audion-flow-rf-node-meta">
        <Chip size="sm" static>
          {flowNode.kind}
        </Chip>
        {flowNode.gateCondition ? (
          <Chip size="sm" static>
            {flowNode.gateCondition}
          </Chip>
        ) : null}
      </p>
      <p className="audion-flow-rf-node-label">{flowNode.label}</p>
      {flowNode.text ? (
        <p className="audion-flow-rf-node-text">{truncate(flowNode.text)}</p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="audion-flow-rf-handle" />
    </div>
  )
}

export const UxFlowRfNode = memo(UxFlowRfNodeInner)
