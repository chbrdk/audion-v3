/**
 * Heuristic map of agent job progress → UX Test Flow node run states.
 * @see specs/domain/ux-test-flow-model.md — In-flow live run
 */

import type { UxFlowNode, UxTestFlow } from '@audion-v3/contracts'
import { defaultExecutionPath, whenBranchPath } from './ux-test-flow-graph'

export type FlowNodeRunState = 'idle' | 'active' | 'done' | 'skipped' | 'error'

export type FlowRunProgressInput = {
  status: 'running' | 'complete' | 'error' | string
  steps?: Array<{ action?: string; target?: string; result?: string }> | null
  finalUrl?: string | null
  finalTitle?: string | null
  success?: boolean | null
  error?: string | null
}

function nodeWeight(n: UxFlowNode): number {
  switch (n.kind) {
    case 'start':
      return 0
    case 'observe':
      return 2
    case 'action':
      return 2
    case 'gate':
      return 1
    case 'prompt':
    case 'message':
    case 'measure':
      return 1
    case 'success':
    case 'abandon':
      return 1
    default:
      return 1
  }
}

export function extractLastHttpUrl(
  steps: Array<{ target?: string }> | null | undefined,
  finalUrl?: string | null,
): string | null {
  if (finalUrl?.trim()) return finalUrl.trim()
  if (!steps?.length) return null
  for (let i = steps.length - 1; i >= 0; i--) {
    const t = steps[i]?.target?.trim()
    if (t && /^https?:\/\//i.test(t)) return t
  }
  return null
}

function patternMatches(pattern: string | null | undefined, haystack: string): boolean {
  if (!pattern?.trim()) return false
  try {
    return new RegExp(pattern, 'i').test(haystack)
  } catch {
    return haystack.toLowerCase().includes(pattern.toLowerCase())
  }
}

function buildExecPath(
  flow: UxTestFlow,
  lastUrl: string | null,
  lastTitle: string | null,
): { path: UxFlowNode[]; gateMatched: boolean } {
  const base = defaultExecutionPath(flow)
  const gate = base.find(
    (n) =>
      n.kind === 'gate' &&
      (n.gateCondition === 'url_match' || n.gateCondition === 'title_match'),
  )
  if (!gate) return { path: base, gateMatched: false }

  const matched =
    gate.gateCondition === 'url_match'
      ? Boolean(lastUrl && patternMatches(gate.pattern, lastUrl))
      : Boolean(lastTitle && patternMatches(gate.pattern, lastTitle))

  if (!matched) return { path: base, gateMatched: false }

  const idx = base.findIndex((n) => n.id === gate.id)
  const when = whenBranchPath(flow, gate.id)
  return {
    path: [...base.slice(0, idx + 1), ...when],
    gateMatched: true,
  }
}

function cursorIndex(path: UxFlowNode[], stepCount: number): number {
  if (path.length === 0) return 0
  if (stepCount <= 0) return 0
  let budget = stepCount
  for (let i = 0; i < path.length; i++) {
    const w = Math.max(1, nodeWeight(path[i]))
    if (i === 0 && path[i].kind === 'start') {
      // start consumes no steps; leave immediately once any step exists
      continue
    }
    if (budget < w) return i
    budget -= w
  }
  return path.length - 1
}

/**
 * Map agent job snapshot to per-node run states for canvas highlighting.
 */
export function mapJobToFlowNodeStates(
  flow: UxTestFlow,
  job: FlowRunProgressInput,
): Record<string, FlowNodeRunState> {
  const nodes = flow.nodes ?? []
  const states: Record<string, FlowNodeRunState> = {}
  for (const n of nodes) states[n.id] = 'idle'

  // Parallel persona markers (message with personaId, not on default path) → skipped
  const defaultIds = new Set(defaultExecutionPath(flow).map((n) => n.id))
  for (const n of nodes) {
    if (n.kind === 'message' && n.personaId && !defaultIds.has(n.id)) {
      states[n.id] = 'skipped'
    }
  }

  if (!nodes.length) return states

  const steps = job.steps ?? []
  const lastUrl = extractLastHttpUrl(steps, job.finalUrl)
  const lastTitle = job.finalTitle?.trim() || null
  const { path, gateMatched } = buildExecPath(flow, lastUrl, lastTitle)
  if (!path.length) return states

  const status = job.status

  if (status === 'error') {
    const idx = cursorIndex(path, steps.length)
    for (let i = 0; i < idx; i++) states[path[i].id] = 'done'
    states[path[idx].id] = 'error'
    return states
  }

  if (status === 'complete') {
    const ok = job.success === true
    // Mark entire walked path done, then emphasize terminal
    for (const n of path) {
      if (n.kind === 'success') states[n.id] = ok ? 'done' : 'skipped'
      else if (n.kind === 'abandon') states[n.id] = ok ? 'skipped' : 'done'
      else states[n.id] = 'done'
    }
    // If success/abandon not on path (when branch), mark appropriately
    for (const n of nodes) {
      if (n.kind === 'success' && ok) states[n.id] = 'done'
      if (n.kind === 'abandon' && !ok && states[n.id] === 'idle') states[n.id] = 'done'
      if (n.kind === 'success' && !ok && states[n.id] === 'idle') states[n.id] = 'skipped'
      if (n.kind === 'abandon' && ok && states[n.id] === 'idle') states[n.id] = 'skipped'
    }
    // When-branch unused nodes stay skipped if on the other arm
    const whenOnly = new Set<string>()
    for (const n of nodes) {
      if (n.kind !== 'gate') continue
      for (const w of whenBranchPath(flow, n.id)) whenOnly.add(w.id)
    }
    for (const id of whenOnly) {
      if (states[id] === 'idle') states[id] = 'skipped'
    }
    return states
  }

  // running
  let idx = cursorIndex(path, steps.length)
  if (gateMatched) {
    const gateIdx = path.findIndex(
      (n) =>
        n.kind === 'gate' &&
        (n.gateCondition === 'url_match' || n.gateCondition === 'title_match'),
    )
    if (gateIdx >= 0) idx = Math.max(idx, Math.min(gateIdx + 1, path.length - 1))
  }
  for (let i = 0; i < idx; i++) states[path[i].id] = 'done'
  states[path[idx].id] = 'active'
  return states
}
