/**
 * Map UxTestFlow ↔ React Flow nodes/edges. Positions are UI-only.
 * @see specs/domain/ux-test-flow-model.md
 */

import type { Edge as RfEdge, Node as RfNode } from '@xyflow/react'
import type {
  UxFlowEdge,
  UxFlowEdgeKind,
  UxFlowNode,
  UxFlowNodeKind,
  UxTestFlow,
} from '@audion-v3/contracts'
import { flattenFlowBlocks } from './ux-test-flow-graph'
import type { FlowNodeRunOutput, FlowNodeRunState } from './ux-flow-run-progress'

export type UxFlowRfNodeData = {
  flowNode: UxFlowNode
  /** Inline edit from inside the node (n8n-style). */
  onUpdate?: (nodeId: string, patch: Partial<UxFlowNode>) => void
  /** Live run highlight from in-flow Testen (run A). */
  runState?: FlowNodeRunState
  /** Optional parallel segment highlight (run B). */
  runStateB?: FlowNodeRunState
  /** Latest agent step text/image for this node during Testen. */
  runOutput?: FlowNodeRunOutput | null
  /** Live gate evaluation for gate nodes (board mode). */
  gateEvaluation?: {
    matched?: boolean
    evidence?: string | null
    condition?: string | null
  } | null
  /** Full test or segment run in progress. */
  runBusy?: boolean
  onManualGate?: (edgeKind: 'when' | 'otherwise') => void
  onPlaySegment?: () => void
  onOutputToNote?: () => void
}

export type UxFlowRfEdgeData = {
  kind: UxFlowEdgeKind
}

export type UxFlowRfNode = RfNode<UxFlowRfNodeData>
export type UxFlowRfEdge = RfEdge<UxFlowRfEdgeData>

const COL_W = 320
const ROW_H = 170

const EDGE_LABEL: Record<UxFlowEdgeKind, string> = {
  then: 'dann',
  when: 'wenn',
  otherwise: 'sonst',
  parallel: 'parallel',
}

export function edgeKindLabel(kind: UxFlowEdgeKind): string {
  return EDGE_LABEL[kind] ?? kind
}

export function sourceHandleForEdgeKind(kind: UxFlowEdgeKind): string | undefined {
  if (kind === 'when' || kind === 'otherwise' || kind === 'then' || kind === 'parallel') {
    return kind
  }
  return undefined
}

/** Deterministic layout from flattenFlowBlocks (depth → x, order → y). */
export function layoutPositionsFromFlow(flow: UxTestFlow): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const blocks = flattenFlowBlocks(flow)
  blocks.forEach((b, index) => {
    if (positions.has(b.node.id)) return
    positions.set(b.node.id, { x: b.depth * COL_W, y: index * ROW_H })
  })
  let orphanIndex = blocks.length
  for (const n of flow.nodes ?? []) {
    if (positions.has(n.id)) continue
    positions.set(n.id, { x: 0, y: orphanIndex * ROW_H })
    orphanIndex += 1
  }
  return positions
}

export function flowToRfNodesEdges(flow: UxTestFlow): {
  nodes: UxFlowRfNode[]
  edges: UxFlowRfEdge[]
} {
  const positions = layoutPositionsFromFlow(flow)
  const byId = new Map((flow.nodes ?? []).map((n) => [n.id, n]))
  const nodes: UxFlowRfNode[] = (flow.nodes ?? []).map((n) => ({
    id: n.id,
    type: 'uxFlow',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: { flowNode: { ...n } },
  }))
  const edges: UxFlowRfEdge[] = (flow.edges ?? []).map((e) => {
    const from = byId.get(e.from)
    const handle =
      from?.kind === 'gate'
        ? e.kind === 'when' || e.kind === 'otherwise'
          ? e.kind
          : 'then'
        : 'then'
    return {
      id: e.id,
      source: e.from,
      target: e.to,
      sourceHandle: handle,
      targetHandle: 'in',
      label: edgeKindLabel(e.kind),
      data: { kind: e.kind },
    }
  })
  return { nodes, edges }
}

export function rfToUxTestFlow(
  base: UxTestFlow,
  nodes: UxFlowRfNode[],
  edges: UxFlowRfEdge[],
): UxTestFlow {
  const uxNodes: UxFlowNode[] = nodes.map((n) => ({
    ...(n.data?.flowNode ?? { id: n.id, kind: 'prompt' as UxFlowNodeKind, label: n.id }),
    id: n.id,
  }))
  const uxEdges: UxFlowEdge[] = edges.map((e) => {
    const fromHandle = e.sourceHandle
    const kindFromHandle: UxFlowEdgeKind | null =
      fromHandle === 'when' ||
      fromHandle === 'otherwise' ||
      fromHandle === 'then' ||
      fromHandle === 'parallel'
        ? fromHandle
        : null
    return {
      id: e.id,
      from: e.source,
      to: e.target,
      kind: (e.data?.kind ?? kindFromHandle ?? 'then') as UxFlowEdgeKind,
    }
  })
  const kinds = [...new Set(uxNodes.map((n) => n.kind))] as UxFlowNodeKind[]
  return {
    ...base,
    nodes: uxNodes,
    edges: uxEdges,
    nodeKindsUsed: kinds.length ? kinds : base.nodeKindsUsed,
    compileReady: uxNodes.length > 0 && uxEdges.length > 0,
  }
}

/** Prefer handle id, then when/otherwise for gates until both exist; else then. */
export function nextEdgeKindForSource(
  sourceNode: UxFlowNode | undefined,
  existingEdges: Array<{ from: string; kind: UxFlowEdgeKind }>,
  sourceId: string,
  sourceHandle?: string | null,
): UxFlowEdgeKind {
  if (
    sourceHandle === 'when' ||
    sourceHandle === 'otherwise' ||
    sourceHandle === 'then' ||
    sourceHandle === 'parallel'
  ) {
    return sourceHandle
  }
  if (sourceNode?.kind === 'gate') {
    const outs = existingEdges.filter((e) => e.from === sourceId)
    if (!outs.some((e) => e.kind === 'when')) return 'when'
    if (!outs.some((e) => e.kind === 'otherwise')) return 'otherwise'
  }
  return 'then'
}

export const UX_FLOW_NODE_KINDS: UxFlowNodeKind[] = [
  'start',
  'prompt',
  'observe',
  'action',
  'gate',
  'message',
  'success',
  'abandon',
  'measure',
]

export const UX_FLOW_GATE_OPTIONS = [
  'frustration_high',
  'url_match',
  'title_match',
  'consent_accepted',
  'consent_rejected',
  'goal_reached',
  'confusion_named',
  'time_elapsed',
] as const

export function newUxFlowNode(kind: UxFlowNodeKind, idSuffix?: string): UxFlowNode {
  const id = `n-${kind}-${idSuffix ?? Date.now().toString(36)}`
  const base: UxFlowNode = {
    id,
    kind,
    label: kind.charAt(0).toUpperCase() + kind.slice(1),
  }
  if (kind === 'gate') {
    return { ...base, gateCondition: 'goal_reached' }
  }
  if (kind === 'observe') {
    return { ...base, text: 'Schau dich kurz um.', observeSeconds: 30 }
  }
  if (
    kind === 'prompt' ||
    kind === 'action' ||
    kind === 'message' ||
    kind === 'abandon' ||
    kind === 'success' ||
    kind === 'measure'
  ) {
    return { ...base, text: '' }
  }
  return base
}
