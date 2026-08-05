/**
 * Mid-run Live-Gate replan helpers — next-segment branch tasks from flow graph + gate signals.
 * Shared by canvas tests and Study-from-Flow → agent `flow_graph`.
 * @see specs/domain/ux-test-flow-model.md — Mid-run agent replan / branch planner
 */

import type {
  UxFlowGateCondition,
  UxFlowGateSignalBundle,
  UxFlowGraphSnapshot,
  UxFlowNode,
  UxFlowReplanEvent,
  UxTestFlow,
} from '@audion-v3/contracts'
import {
  activeExecutionPath,
  defaultExecutionPath,
  gateChoicesFromReplans,
  nextSegmentAfterGate,
  outs,
  whenBranchPath,
} from './ux-test-flow-graph'
import { evaluateFlowGatesOnPath } from './ux-flow-run-progress'

export function toFlowGraphSnapshot(flow: UxTestFlow): UxFlowGraphSnapshot | null {
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  if (!nodes.length || !edges.length) return null
  return {
    id: flow.id,
    name: flow.name,
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  }
}

export function snapshotAsTestFlow(graph: UxFlowGraphSnapshot): UxTestFlow {
  return {
    id: graph.id,
    name: graph.name?.trim() || graph.id,
    description: '',
    scenarioIndex: 0,
    primaryArchetype: 'task_goal',
    nodeKindsUsed: [],
    defaultWaveKey: graph.id,
    compileReady: true,
    nodes: graph.nodes,
    edges: graph.edges,
  }
}

function nodeTaskFragment(n: UxFlowNode): string | null {
  if (n.kind === 'start' || n.kind === 'gate') return null
  if (!n.text?.trim() && !n.label?.trim()) return null
  const prefix =
    n.kind === 'observe' && n.observeSeconds
      ? `Beobachten (~${n.observeSeconds}s): `
      : n.kind === 'message'
        ? 'Hinweis: '
        : n.kind === 'measure'
          ? 'Messung: '
          : n.kind === 'abandon'
            ? 'Abbruch: '
            : n.kind === 'success'
              ? 'Erfolg: '
              : n.kind === 'action'
                ? 'Aktion: '
                : ''
  const body = (n.text?.trim() || n.label).trim()
  return `${prefix}${body}`
}

/** Concatenate remaining nodes on a branch into a replan task string. */
export function compileBranchRemainingTask(
  flow: UxTestFlow,
  branchNodes: UxFlowNode[],
  opts?: { gateCondition?: UxFlowGateCondition | null; edgeKind?: 'when' | 'otherwise' },
): string {
  const parts: string[] = []
  const cond = opts?.gateCondition
  const edge = opts?.edgeKind ?? 'when'
  if (cond) {
    parts.push(
      `LIVE-GATE REPLAN (${cond} → ${edge}): Die Gate-Bedingung ist eingetreten. ` +
        `Ignoriere den bisherigen Hauptpfad und folge nur noch diesen Schritten:`,
    )
  } else {
    parts.push('LIVE-GATE REPLAN: Folge nur noch diesen Schritten:')
  }
  for (const n of branchNodes) {
    const frag = nodeTaskFragment(n)
    if (frag) parts.push(frag)
  }
  if (parts.length < 2) {
    parts.push(
      'Beende die Aufgabe ehrlich (done) und erkläre kurz, warum der Gate-Zweig gewählt wurde.',
    )
  }
  return parts.join(' ')
}

/** Phase 4: next-segment task (stop before nested gates). */
export function compileNextSegmentTask(
  flow: UxTestFlow,
  gateId: string,
  opts?: { gateCondition?: UxFlowGateCondition | null; edgeKind?: 'when' | 'otherwise' },
): string {
  const edge = opts?.edgeKind ?? 'when'
  const segment = nextSegmentAfterGate(flow, gateId, edge)
  return compileBranchRemainingTask(flow, segment, {
    gateCondition: opts?.gateCondition,
    edgeKind: edge,
  })
}

/** Hybrid protocol: task text for a single agent-runnable node. */
export function compileHybridSegmentTask(flow: UxTestFlow, nodeId: string): string | null {
  const node = (flow.nodes ?? []).find((n) => n.id === nodeId)
  if (!node) return null
  if (node.kind === 'start' || node.kind === 'gate' || node.kind === 'measure') return null
  const frag = nodeTaskFragment(node)
  if (!frag) return null
  return `HYBRID-SEGMENT (${flow.id} / ${node.id}): Führe nur diesen Protokoll-Schritt aus, dann done. ${frag}`
}

export type MidRunReplanDecision = {
  shouldReplan: boolean
  gateNodeId: string | null
  condition: UxFlowGateCondition | null
  edgeKind: 'when' | 'otherwise'
  remainingTask: string | null
  replan: UxFlowReplanEvent | null
}

/**
 * Decide whether a Live-Gate should trigger a mid-run replan onto the next when-segment.
 * Caller tracks already-replanned gate ids; walks the active path (Phase 4 multi-gate).
 */
export function decideMidRunReplan(
  flow: UxTestFlow,
  signals: UxFlowGateSignalBundle,
  alreadyReplannedGateIds: ReadonlySet<string> = new Set(),
  replanHistory?: ReadonlyArray<UxFlowReplanEvent> | null,
): MidRunReplanDecision {
  const choices = gateChoicesFromReplans(alreadyReplannedGateIds, replanHistory)
  const path = activeExecutionPath(flow, choices)
  const { evaluations, gateMatched, matchedGateId } = evaluateFlowGatesOnPath(
    flow,
    path,
    signals,
    null,
    alreadyReplannedGateIds,
  )
  if (!gateMatched || !matchedGateId) {
    return {
      shouldReplan: false,
      gateNodeId: null,
      condition: null,
      edgeKind: 'otherwise',
      remainingTask: null,
      replan: null,
    }
  }
  if (alreadyReplannedGateIds.has(matchedGateId)) {
    return {
      shouldReplan: false,
      gateNodeId: matchedGateId,
      condition: evaluations.find((e) => e.gateNodeId === matchedGateId)?.condition ?? null,
      edgeKind: 'when',
      remainingTask: null,
      replan: null,
    }
  }
  const gate = (flow.nodes ?? []).find((n) => n.id === matchedGateId)
  const condition =
    gate?.gateCondition ??
    evaluations.find((e) => e.gateNodeId === matchedGateId)?.condition ??
    null
  const remainingTask = compileNextSegmentTask(flow, matchedGateId, {
    gateCondition: condition,
    edgeKind: 'when',
  })
  const replan: UxFlowReplanEvent = {
    gateNodeId: matchedGateId,
    edgeKind: 'when',
    condition: condition ?? 'goal_reached',
    remainingTask,
    at: new Date().toISOString(),
  }
  return {
    shouldReplan: true,
    gateNodeId: matchedGateId,
    condition,
    edgeKind: 'when',
    remainingTask,
    replan,
  }
}

/** Otherwise-path remaining nodes after a gate (for moderated protocol). */
export function otherwiseBranchPath(flow: UxTestFlow, gateId: string): UxFlowNode[] {
  const edges = flow.edges ?? []
  const nodes = flow.nodes ?? []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const first = outs(edges, gateId, 'otherwise')[0]?.to
  if (!first) return []
  const path: UxFlowNode[] = []
  let id: string | null = first
  const seen = new Set<string>()
  while (id && !seen.has(id)) {
    seen.add(id)
    const n = byId.get(id)
    if (!n) break
    path.push(n)
    if (n.kind === 'gate') {
      id = outs(edges, id, 'otherwise')[0]?.to ?? null
      continue
    }
    id = outs(edges, id, 'then')[0]?.to ?? null
  }
  return path
}

export function protocolDefaultPath(flow: UxTestFlow): UxFlowNode[] {
  return defaultExecutionPath(flow)
}

export { whenBranchPath }
