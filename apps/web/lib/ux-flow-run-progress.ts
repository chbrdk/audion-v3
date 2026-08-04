/**
 * Heuristic + Live-Gate map of agent job progress → UX Test Flow node run states.
 * @see specs/domain/ux-test-flow-model.md — In-flow live run / Live-Gate signals
 */

import type {
  UxFlowCursor,
  UxFlowGateCondition,
  UxFlowGateEvaluation,
  UxFlowGateSignalBundle,
  UxFlowNode,
  UxTestFlow,
} from '@audion-v3/contracts'
import { defaultExecutionPath, whenBranchPath } from './ux-test-flow-graph'

export type FlowNodeRunState = 'idle' | 'active' | 'done' | 'skipped' | 'error'

/** Live agent output attached to a flow node during Testen. */
export type FlowNodeRunOutput = {
  step?: number | null
  label?: string | null
  text?: string | null
  imageUrl?: string | null
}

export type FlowRunProgressStep = {
  step?: number
  action?: string
  target?: string
  result?: string
  reasoning?: string | null
  timestamp?: string | null
  screenshot?: string | null
  screenshotUrl?: string | null
  perception?: Record<string, unknown> | null
  thinkAloud?: Record<string, unknown> | null
  reasoningMeta?: {
    evaluation_previous_goal?: string | null
    memory?: string | null
    next_goal?: string | null
  } | null
}

export type FlowRunProgressInput = {
  status: 'running' | 'complete' | 'error' | string
  steps?: FlowRunProgressStep[] | null
  finalUrl?: string | null
  finalTitle?: string | null
  success?: boolean | null
  error?: string | null
  scorecard?: Record<string, unknown> | null
  /** Agent-emitted Live-Gate signals (preferred over raw URL/title when set). */
  gateSignals?: UxFlowGateSignalBundle | null
  /** Optional agent/BFF cursor; when present, gate branch + active node win over heuristics. */
  flowCursor?: UxFlowCursor | null
  /** Job id for rewriting relative screenshot paths. */
  jobId?: string | null
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

export function patternMatches(pattern: string | null | undefined, haystack: string): boolean {
  if (!pattern?.trim()) return false
  try {
    return new RegExp(pattern, 'i').test(haystack)
  } catch {
    return haystack.toLowerCase().includes(pattern.toLowerCase())
  }
}

const CONSENT_ACCEPT_RE =
  /bestätig|akzeptier|zustimm|einwillig|accept\b|allow\s+(all|cookies)|cookie.*akzept|externen?\s+inhalt/i
const CONSENT_REJECT_RE =
  /ablehn|reject|decline|verweig|ohne\s+(cookies?|einwillig)|zu\s+google|nicht\s+bestätig|dismiss/i

const AGENT_CURSOR_GATE_CONDS = new Set<UxFlowGateCondition>([
  'frustration_high',
  'confusion_named',
  'consent_accepted',
  'consent_rejected',
  'goal_reached',
])

function stepTextBlob(step: FlowRunProgressStep): string {
  const parts: string[] = []
  for (const key of ['action', 'target', 'result', 'reasoning'] as const) {
    const v = step[key]
    if (typeof v === 'string' && v.trim()) parts.push(v)
  }
  const ta = step.thinkAloud
  if (ta && typeof ta === 'object') {
    for (const v of Object.values(ta)) {
      if (typeof v === 'string' && v.trim()) parts.push(v)
    }
  }
  return parts.join(' ')
}

function elapsedSecondsFromSteps(steps: FlowRunProgressStep[]): number | null {
  const stamps: number[] = []
  for (const step of steps) {
    const raw = step.timestamp?.trim()
    if (!raw) continue
    const ms = Date.parse(raw)
    if (!Number.isNaN(ms)) stamps.push(ms)
  }
  if (stamps.length < 2) return stamps.length ? 0 : null
  return Math.max(0, (Math.max(...stamps) - Math.min(...stamps)) / 1000)
}

/** Observe window for a gate: nearest preceding observe node on the default path. */
export function precedingObserveSeconds(flow: UxTestFlow, gateNodeId: string): number {
  const base = defaultExecutionPath(flow)
  const idx = base.findIndex((n) => n.id === gateNodeId)
  for (let i = idx - 1; i >= 0; i--) {
    const n = base[i]
    if (n?.kind === 'observe' && typeof n.observeSeconds === 'number' && n.observeSeconds > 0) {
      return n.observeSeconds
    }
  }
  return 30
}

/** Derive gateSignals from steps/result when the agent omitted the bundle. */
export function deriveGateSignalsFromJob(job: FlowRunProgressInput): UxFlowGateSignalBundle {
  if (job.gateSignals) return job.gateSignals
  const steps = job.steps ?? []
  const lastUrl = extractLastHttpUrl(steps, job.finalUrl)
  const lastTitle = job.finalTitle?.trim() || null
  let frustrationHigh = false
  let confusionNamed = false
  let consentAccepted = false
  let consentRejected = false
  for (const step of steps) {
    const blob = stepTextBlob(step)
    if (blob) {
      if (CONSENT_ACCEPT_RE.test(blob)) consentAccepted = true
      if (CONSENT_REJECT_RE.test(blob)) consentRejected = true
    }
    const perc = step.perception ?? step.thinkAloud
    if (!perc || typeof perc !== 'object') continue
    const stance = String((perc as { stance?: unknown }).stance ?? '').toLowerCase()
    const clarity = (perc as { clarity?: unknown }).clarity
    const confusion = (perc as { confusion?: unknown }).confusion
    if (stance === 'abandon') frustrationHigh = true
    if (typeof clarity === 'number' && clarity <= 0) frustrationHigh = true
    if (confusion != null && String(confusion).trim()) {
      confusionNamed = true
      frustrationHigh = true
    }
  }
  let goalReached = job.success === true
  const sc = job.scorecard
  if (sc && typeof sc === 'object') {
    if (sc.goalReached === true) goalReached = true
    const cov = sc.coverage
    if (cov && typeof cov === 'object' && (cov as { goalReached?: unknown }).goalReached === true) {
      goalReached = true
    }
  }
  return {
    finalUrl: lastUrl,
    finalTitle: lastTitle,
    frustrationHigh,
    confusionNamed,
    consentAccepted,
    consentRejected,
    goalReached,
    elapsedSeconds: elapsedSecondsFromSteps(steps),
    evaluatedAt: null,
  }
}

function evaluateGateCondition(
  condition: UxFlowGateCondition | null | undefined,
  pattern: string | null | undefined,
  signals: UxFlowGateSignalBundle,
  observeSeconds?: number | null,
): { matched: boolean; evidence: string | null } {
  switch (condition) {
    case 'url_match': {
      const url = signals.finalUrl?.trim()
      if (!url) return { matched: false, evidence: null }
      const ok = patternMatches(pattern, url)
      return { matched: ok, evidence: ok ? url : null }
    }
    case 'title_match': {
      const title = signals.finalTitle?.trim()
      if (!title) return { matched: false, evidence: null }
      const ok = patternMatches(pattern, title)
      return { matched: ok, evidence: ok ? title : null }
    }
    case 'frustration_high':
      return {
        matched: Boolean(signals.frustrationHigh),
        evidence: signals.frustrationHigh ? 'frustrationHigh' : null,
      }
    case 'confusion_named':
      return {
        matched: Boolean(signals.confusionNamed),
        evidence: signals.confusionNamed ? 'confusionNamed' : null,
      }
    case 'consent_accepted':
      return {
        matched: Boolean(signals.consentAccepted),
        evidence: signals.consentAccepted ? 'consentAccepted' : null,
      }
    case 'consent_rejected':
      return {
        matched: Boolean(signals.consentRejected),
        evidence: signals.consentRejected ? 'consentRejected' : null,
      }
    case 'goal_reached':
      return {
        matched: Boolean(signals.goalReached),
        evidence: signals.goalReached ? 'goalReached' : null,
      }
    case 'time_elapsed': {
      const need = typeof observeSeconds === 'number' && observeSeconds > 0 ? observeSeconds : 30
      const elapsed = typeof signals.elapsedSeconds === 'number' ? signals.elapsedSeconds : 0
      const ok = elapsed >= need
      return { matched: ok, evidence: ok ? String(elapsed) : null }
    }
    default:
      return { matched: false, evidence: null }
  }
}

/**
 * Evaluate closed-set gates against agent gateSignals.
 * Returns evaluations + whether any gate on the default path matched (take `when`).
 */
export function evaluateFlowGates(
  flow: UxTestFlow,
  signals: UxFlowGateSignalBundle,
  cursorEvals?: UxFlowGateEvaluation[] | null,
): { evaluations: UxFlowGateEvaluation[]; gateMatched: boolean; matchedGateId: string | null } {
  const cursorByCondition = new Map<string, UxFlowGateEvaluation>()
  for (const e of cursorEvals ?? []) {
    if (e?.condition) cursorByCondition.set(e.condition, e)
  }

  const base = defaultExecutionPath(flow)
  const evaluations: UxFlowGateEvaluation[] = []
  let gateMatched = false
  let matchedGateId: string | null = null

  for (const n of base) {
    if (n.kind !== 'gate' || !n.gateCondition) continue
    const fromCursor = cursorByCondition.get(n.gateCondition)
    let matched = false
    let evidence: string | null = null
    if (fromCursor && AGENT_CURSOR_GATE_CONDS.has(n.gateCondition)) {
      matched = Boolean(fromCursor.matched)
      evidence = fromCursor.evidence ?? null
    } else {
      const observeSecs =
        n.gateCondition === 'time_elapsed' ? precedingObserveSeconds(flow, n.id) : null
      const local = evaluateGateCondition(n.gateCondition, n.pattern, signals, observeSecs)
      matched = local.matched
      evidence = local.evidence
    }
    evaluations.push({
      condition: n.gateCondition,
      matched,
      evidence,
      gateNodeId: n.id,
    })
    if (matched && !gateMatched) {
      gateMatched = true
      matchedGateId = n.id
    }
  }
  return { evaluations, gateMatched, matchedGateId }
}

function buildExecPath(
  flow: UxTestFlow,
  signals: UxFlowGateSignalBundle,
  cursor?: UxFlowCursor | null,
): { path: UxFlowNode[]; gateMatched: boolean } {
  const base = defaultExecutionPath(flow)
  const { gateMatched, matchedGateId } = evaluateFlowGates(
    flow,
    signals,
    cursor?.gateEvaluations,
  )
  if (!gateMatched) return { path: base, gateMatched: false }

  const gateId =
    matchedGateId ||
    base.find((n) => n.kind === 'gate' && n.gateCondition)?.id

  if (!gateId) return { path: base, gateMatched: false }

  const idx = base.findIndex((n) => n.id === gateId)
  const when = whenBranchPath(flow, gateId)
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

  const defaultIds = new Set(defaultExecutionPath(flow).map((n) => n.id))
  for (const n of nodes) {
    if (n.kind === 'message' && n.personaId && !defaultIds.has(n.id)) {
      states[n.id] = 'skipped'
    }
  }

  if (!nodes.length) return states

  const steps = job.steps ?? []
  const signals = deriveGateSignalsFromJob({
    ...job,
    finalUrl: job.gateSignals?.finalUrl ?? job.finalUrl,
    finalTitle: job.gateSignals?.finalTitle ?? job.finalTitle,
  })
  const { path, gateMatched } = buildExecPath(flow, signals, job.flowCursor)
  if (!path.length) return states

  const status = job.status
  const cursorActiveId = job.flowCursor?.activeNodeId?.trim() || null

  if (status === 'error') {
    const idx = cursorActiveId
      ? Math.max(0, path.findIndex((n) => n.id === cursorActiveId))
      : cursorIndex(path, steps.length)
    const safeIdx = idx >= 0 ? idx : cursorIndex(path, steps.length)
    for (let i = 0; i < safeIdx; i++) states[path[i].id] = 'done'
    states[path[safeIdx].id] = 'error'
    return states
  }

  if (status === 'complete') {
    const ok = job.success === true
    for (const n of path) {
      if (n.kind === 'success') states[n.id] = ok ? 'done' : 'skipped'
      else if (n.kind === 'abandon') states[n.id] = ok ? 'skipped' : 'done'
      else states[n.id] = 'done'
    }
    for (const n of nodes) {
      if (n.kind === 'success' && ok) states[n.id] = 'done'
      if (n.kind === 'abandon' && !ok && states[n.id] === 'idle') states[n.id] = 'done'
      if (n.kind === 'success' && !ok && states[n.id] === 'idle') states[n.id] = 'skipped'
      if (n.kind === 'abandon' && ok && states[n.id] === 'idle') states[n.id] = 'skipped'
    }
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
  if (cursorActiveId) {
    const found = path.findIndex((n) => n.id === cursorActiveId)
    if (found >= 0) idx = found
  } else if (gateMatched) {
    const gateIdx = path.findIndex((n) => n.kind === 'gate')
    if (gateIdx >= 0) idx = Math.max(idx, Math.min(gateIdx + 1, path.length - 1))
  }
  for (let i = 0; i < idx; i++) states[path[i].id] = 'done'
  states[path[idx].id] = 'active'
  return states
}

/** Merge two run-state maps for dual-cursor (A primary, B secondary). */
export function mergeDualRunStates(
  a: Record<string, FlowNodeRunState>,
  b: Record<string, FlowNodeRunState>,
): {
  primary: Record<string, FlowNodeRunState>
  secondary: Record<string, FlowNodeRunState>
} {
  return { primary: a, secondary: b }
}

function rewriteScreenshotUrl(
  url: string | null | undefined,
  jobId?: string | null,
  stepNum?: number | null,
): string | null {
  if (url?.trim()) {
    const raw = url.trim()
    if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw
    }
    if (raw.startsWith('/api/')) return raw
    if (raw.startsWith('/run/')) return `/api/ux-journey-agent${raw}`
    return raw
  }
  if (jobId && stepNum != null && stepNum > 0) {
    return `/api/ux-journey-agent/run/${encodeURIComponent(jobId)}/step/${stepNum}/screenshot`
  }
  return null
}

function stepHeadline(step: FlowRunProgressStep): string {
  const action = step.action?.trim()
  const target = step.target?.trim()
  if (action && target) return `${action}: ${target.slice(0, 80)}`
  if (action) return action
  if (target) return target.slice(0, 100)
  return `Step ${step.step ?? '?'}`
}

function stepBodyText(step: FlowRunProgressStep): string | null {
  const parts: string[] = []
  if (step.result?.trim()) parts.push(step.result.trim())
  if (step.reasoning?.trim()) parts.push(step.reasoning.trim())
  const ta = step.thinkAloud
  if (ta && typeof ta === 'object') {
    for (const key of ['now', 'next', 'feeling', 'confusion'] as const) {
      const v = (ta as Record<string, unknown>)[key]
      if (typeof v === 'string' && v.trim()) parts.push(`${key}: ${v.trim()}`)
    }
  }
  const meta = step.reasoningMeta
  if (meta?.next_goal?.trim()) parts.push(`next: ${meta.next_goal.trim()}`)
  if (meta?.memory?.trim()) parts.push(`memory: ${meta.memory.trim()}`)
  if (!parts.length) return null
  const joined = parts.join('\n')
  return joined.length > 420 ? `${joined.slice(0, 419)}…` : joined
}

function pathIndexForStepBudget(path: UxFlowNode[], stepOrdinal: number): number {
  // stepOrdinal is 1-based count of steps consumed so far
  return cursorIndex(path, stepOrdinal)
}

/**
 * Attach latest agent step text/image to nodes along the execution path.
 * Each path node keeps the last step that fell into its budget window;
 * the active node also receives the overall latest step.
 */
export function mapJobToFlowNodeOutputs(
  flow: UxTestFlow,
  job: FlowRunProgressInput,
): Record<string, FlowNodeRunOutput> {
  const out: Record<string, FlowNodeRunOutput> = {}
  const steps = job.steps ?? []
  if (!steps.length) return out

  const signals = deriveGateSignalsFromJob({
    ...job,
    finalUrl: job.gateSignals?.finalUrl ?? job.finalUrl,
    finalTitle: job.gateSignals?.finalTitle ?? job.finalTitle,
  })
  const { path } = buildExecPath(flow, signals, job.flowCursor)
  if (!path.length) return out

  const states = mapJobToFlowNodeStates(flow, job)
  let activeId =
    Object.entries(states).find(([, s]) => s === 'active' || s === 'error')?.[0] ?? null
  if (job.flowCursor?.activeNodeId) activeId = job.flowCursor.activeNodeId

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const ordinal = i + 1
    const idx = pathIndexForStepBudget(path, ordinal)
    const node = path[idx]
    if (!node) continue
    const stepNum = step.step ?? ordinal
    out[node.id] = {
      step: stepNum,
      label: stepHeadline(step),
      text: stepBodyText(step),
      imageUrl: rewriteScreenshotUrl(
        step.screenshotUrl ?? step.screenshot,
        job.jobId,
        stepNum,
      ),
    }
  }

  // Ensure active node shows the freshest step even if budget lagged.
  if (activeId && steps.length) {
    const last = steps[steps.length - 1]
    const stepNum = last.step ?? steps.length
    out[activeId] = {
      step: stepNum,
      label: stepHeadline(last),
      text: stepBodyText(last),
      imageUrl: rewriteScreenshotUrl(
        last.screenshotUrl ?? last.screenshot,
        job.jobId,
        stepNum,
      ),
    }
  }

  return out
}
