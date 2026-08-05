/**
 * Flow completion + evidence verdict (Board + Wave sync).
 * @see specs/domain/ux-test-flow-model.md — Completion & evidence contract (Phase 7)
 */

import type { UxFlowGateCondition, UxTestFlow } from '@audion-v3/contracts'
import { gateChoicesFromReplans } from './ux-test-flow-graph'
import {
  deriveGateSignalsFromJob,
  evaluateFlowGatesOnPath,
  resolveFlowExecPath,
  type FlowRunProgressInput,
} from './ux-flow-run-progress'
import { inferInfrastructureBlockers, inferValidEvidence } from './ux-wave-scorecard'
import type { UxJourneyAgentStep } from './ux-journey-agent-client'

export type FlowGateVerdictItem = {
  gateNodeId: string
  condition: UxFlowGateCondition | string
  matched: boolean
  branchTaken: 'when' | 'otherwise' | null
  evidence?: string | null
}

/** Board + Study verdict derived from flow graph + agent job snapshot. */
export type FlowRunVerdict = {
  status: 'pending' | 'running' | 'complete' | 'error'
  flowCompleted: boolean
  terminalKind: 'success' | 'abandon' | null
  terminalNodeId: string | null
  terminalLabel: string | null
  taskCompleted: boolean
  goalReached: boolean
  validEvidence: boolean
  validEvidenceCaveat: string | null
  gatesOnPath: FlowGateVerdictItem[]
  blockers: string[]
  agentSuccess: boolean
  stepCount: number
  summary: string
}

function scorecardGoalReached(scorecard?: Record<string, unknown> | null): boolean | null {
  const coverage = scorecard?.coverage
  if (!coverage || typeof coverage !== 'object') return null
  const goal = (coverage as { goalReached?: unknown }).goalReached
  return typeof goal === 'boolean' ? goal : null
}

function scorecardConfusionCount(scorecard?: Record<string, unknown> | null): number | null {
  const confusion = scorecard?.confusion
  if (!confusion || typeof confusion !== 'object') return null
  const count = (confusion as { tagCount?: unknown }).tagCount
  return typeof count === 'number' ? count : null
}

function buildVerdictSummary(input: {
  status: string
  flowCompleted: boolean
  taskCompleted: boolean
  validEvidence: boolean
  terminalKind: 'success' | 'abandon' | null
  goalReached: boolean
}): string {
  if (input.status === 'running') {
    if (input.goalReached) return 'Läuft — Ziel bereits signalisiert.'
    return 'Läuft — Verdict wird nach Abschluss final.'
  }
  if (input.status === 'error') return 'Fehler — kein abgeschlossener Flow.'
  if (input.taskCompleted && input.validEvidence) {
    return input.terminalKind === 'success'
      ? 'Task abgeschlossen mit belastbarer Evidence.'
      : 'Ziel erreicht mit belastbarer Evidence.'
  }
  if (input.flowCompleted && input.terminalKind === 'abandon') {
    return input.validEvidence
      ? 'Ehrlicher Abbruch — Evidence nutzbar.'
      : 'Abbruch ohne ausreichende UX-Substanz.'
  }
  if (input.validEvidence && !input.taskCompleted) {
    return 'Evidence vorhanden, Task nicht abgeschlossen.'
  }
  if (!input.validEvidence && input.taskCompleted) {
    return 'Task signalisiert, Evidence schwach oder blockiert.'
  }
  return 'Run beendet — Task/Evidence offen.'
}

export function deriveFlowVerdict(flow: UxTestFlow, job: FlowRunProgressInput): FlowRunVerdict {
  const steps = job.steps ?? []
  const rawStatus = job.status
  const status: FlowRunVerdict['status'] =
    rawStatus === 'complete'
      ? 'complete'
      : rawStatus === 'error'
        ? 'error'
        : rawStatus === 'running'
          ? 'running'
          : steps.length
            ? 'running'
            : 'pending'

  const signals = deriveGateSignalsFromJob({
    ...job,
    finalUrl: job.gateSignals?.finalUrl ?? job.finalUrl,
    finalTitle: job.gateSignals?.finalTitle ?? job.finalTitle,
  })

  const { path } = resolveFlowExecPath(flow, signals, job.flowCursor)
  const history = job.flowCursor?.replanHistory ?? (job.flowCursor?.replan ? [job.flowCursor.replan] : null)
  const fired = new Set<string>()
  for (const ev of history ?? []) {
    if (ev?.gateNodeId) fired.add(ev.gateNodeId)
  }
  if (job.flowCursor?.replan?.gateNodeId) fired.add(job.flowCursor.replan.gateNodeId)
  const choices = gateChoicesFromReplans(fired, history)

  const { evaluations } = evaluateFlowGatesOnPath(
    flow,
    path,
    signals,
    job.flowCursor?.gateEvaluations,
    fired,
  )

  const gatesOnPath: FlowGateVerdictItem[] = []
  for (const n of path) {
    if (n.kind !== 'gate' || !n.gateCondition) continue
    const ev = evaluations.find((e) => e.gateNodeId === n.id)
    const branchTaken =
      choices[n.id] === 'when'
        ? 'when'
        : choices[n.id] === 'otherwise'
          ? 'otherwise'
          : ev?.matched
            ? 'when'
            : 'otherwise'
    gatesOnPath.push({
      gateNodeId: n.id,
      condition: n.gateCondition,
      matched: Boolean(ev?.matched),
      branchTaken,
      evidence: ev?.evidence ?? null,
    })
  }

  const terminalOnPath = (() => {
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const n = path[i]
      if (n.kind === 'success' || n.kind === 'abandon') {
        return n
      }
    }
    return null
  })()
  const terminalKind =
    terminalOnPath?.kind === 'success' || terminalOnPath?.kind === 'abandon'
      ? terminalOnPath.kind
      : null
  const terminalNodeId = terminalKind ? terminalOnPath!.id : null
  const terminalLabel =
    terminalKind && terminalOnPath
      ? (terminalOnPath.label || terminalOnPath.text || terminalOnPath.id).trim() ||
        terminalOnPath.id
      : null

  const cancelled = Boolean(job.cancelled)
  const agentSuccess = job.success === true && status === 'complete' && !cancelled
  const coverageGoal = scorecardGoalReached(job.scorecard)
  const goalReached = Boolean(signals.goalReached) || coverageGoal === true

  const blob = [
    job.summary,
    job.error,
    ...steps.map((s) => `${s.result ?? ''}\n${s.reasoning ?? ''}`),
  ]
    .filter(Boolean)
    .join('\n')
  const blockers = inferInfrastructureBlockers(blob)

  const flowCompleted =
    status === 'complete' && (terminalKind === 'success' || terminalKind === 'abandon')

  let taskCompleted = false
  if (status === 'complete') {
    if (terminalKind === 'success') taskCompleted = true
    else if (goalReached) taskCompleted = true
    else if (agentSuccess && terminalKind !== 'abandon') taskCompleted = true
  }

  let validEvidence = false
  let validEvidenceCaveat: string | null = null
  if (status === 'complete' || status === 'error') {
    const evidence = inferValidEvidence({
      agentSuccess,
      taskCompleted,
      blockers,
      cancelled,
      summary: job.summary,
      error: job.error,
      steps: steps as UxJourneyAgentStep[],
      confusionTagCount: scorecardConfusionCount(job.scorecard),
    })
    validEvidence = evidence.validEvidence
    validEvidenceCaveat = evidence.validEvidenceCaveat
  }

  return {
    status,
    flowCompleted,
    terminalKind,
    terminalNodeId,
    terminalLabel,
    taskCompleted,
    goalReached,
    validEvidence,
    validEvidenceCaveat,
    gatesOnPath,
    blockers,
    agentSuccess,
    stepCount: steps.length,
    summary: buildVerdictSummary({
      status,
      flowCompleted,
      taskCompleted,
      validEvidence,
      terminalKind,
      goalReached,
    }),
  }
}

/** Merge flow-graph verdict into wave run fields when flowGraph is present. */
export function mergeFlowVerdictIntoWaveRun<
  T extends {
    taskCompleted?: boolean | null
    goalReached?: boolean | null
    validEvidence?: boolean | null
    validEvidenceCaveat?: string | null
  },
>(run: T, verdict: FlowRunVerdict): T {
  return {
    ...run,
    taskCompleted: Boolean(run.taskCompleted) || verdict.taskCompleted,
    goalReached: Boolean(run.goalReached) || verdict.goalReached,
    validEvidence: Boolean(run.validEvidence) || verdict.validEvidence,
    validEvidenceCaveat: run.validEvidenceCaveat ?? verdict.validEvidenceCaveat,
  }
}
