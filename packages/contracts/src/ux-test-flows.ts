/** UX Test Flow contracts — product templates that compile to ScenarioPack-shaped studies. */

import type {
  SoftScoreDomainProfileId,
  SoftScoreKey,
  UxLabArchetype,
  UxSuccessCriteria,
  UxStudyDetail,
  UxWaveDetail,
} from './ux-studies'

export type UxFlowNodeKind =
  | 'start'
  | 'prompt'
  | 'observe'
  | 'action'
  | 'gate'
  | 'message'
  | 'success'
  | 'abandon'
  | 'measure'

export type UxFlowEdgeKind = 'then' | 'when' | 'otherwise' | 'parallel'

export type UxFlowGateCondition =
  | 'frustration_high'
  | 'url_match'
  | 'title_match'
  | 'consent_accepted'
  | 'consent_rejected'
  | 'goal_reached'
  | 'confusion_named'
  | 'time_elapsed'

export type UxFlowNode = {
  id: string
  kind: UxFlowNodeKind
  label: string
  /** Instruction / question body for prompt, observe, action, message, measure, abandon. */
  text?: string | null
  /** start: opaque urlKey or absolute https URL */
  urlKey?: string | null
  personaId?: string | null
  personaName?: string | null
  segment?: string | null
  maxSteps?: number | null
  observeSeconds?: number | null
  gateCondition?: UxFlowGateCondition | null
  /** Regex source for url_match / title_match gates */
  pattern?: string | null
  measureKey?: SoftScoreKey | null
}

export type UxFlowEdge = {
  id: string
  from: string
  to: string
  kind: UxFlowEdgeKind
}

export type UxTestFlow = {
  id: string
  name: string
  description: string
  /** Scenario catalog number 1–10 */
  scenarioIndex: number
  primaryArchetype: UxLabArchetype
  nodeKindsUsed: UxFlowNodeKind[]
  domainProfileId?: SoftScoreDomainProfileId | null
  softScoreKeys?: SoftScoreKey[] | null
  /** Full graph when available; catalog-only entries may omit (legacy). */
  nodes?: UxFlowNode[] | null
  edges?: UxFlowEdge[] | null
  /** Hint success criteria when graph omitted or for pack compile override */
  successCriteria?: UxSuccessCriteria | null
  defaultWaveKey: string
  /** Whether compile to agent study is supported */
  compileReady: boolean
}

export type UxTestFlowSummary = {
  id: string
  name: string
  description: string
  scenarioIndex: number
  primaryArchetype: UxLabArchetype
  nodeKindsUsed: UxFlowNodeKind[]
  compileReady: boolean
}

export type UxStudyFromFlowPayload = {
  /** Fixture id and/or id fallback when `flow.id` is missing. */
  flowId?: string
  /**
   * Session-edited graph snapshot. When set, validate+compile this graph
   * (wins over fixture). Requires a full node/edge graph.
   */
  flow?: UxTestFlow
  name?: string
  projectId?: string | null
  waveKey?: string
}

export type UxStudyFromFlowResult = {
  study: UxStudyDetail
  wave: UxWaveDetail
  flowId: string
}

/** Persisted user-edited flow snapshot (Postgres `ux_saved_flows` or in-memory). */
export type UxSavedFlow = {
  id: string
  /** Catalog template id this edit descends from. */
  templateFlowId: string
  name: string
  flow: UxTestFlow
  /** Session user id when known (Phase 4 ACL foundation). */
  ownerId?: string | null
  /** Optional org / team scope (Phase 4 ACL foundation). */
  orgId?: string | null
  updatedAt: string
  createdAt: string
}

export type UxSavedFlowSummary = {
  id: string
  templateFlowId: string
  name: string
  ownerId?: string | null
  orgId?: string | null
  updatedAt: string
}

export type UxSavedFlowWritePayload = {
  /** When set, upsert that saved id; otherwise upsert by templateFlowId. */
  id?: string
  templateFlowId: string
  name?: string
  flow: UxTestFlow
  ownerId?: string | null
  orgId?: string | null
}

/** Hybrid protocol: hand one agent-runnable node/segment to the journey agent. */
export type UxFlowHybridSegmentPayload = {
  flow: UxTestFlow
  nodeId: string
  maxSteps?: number | null
}

export type UxFlowHybridSegmentResult = {
  jobId: string
  url: string
  task: string
  nodeId: string
}

/** Agent poll extras for Live-Gate progress (optional on job status). */
export type UxFlowGateSignalBundle = {
  finalUrl?: string | null
  finalTitle?: string | null
  frustrationHigh?: boolean
  confusionNamed?: boolean
  /** Heuristic: accept/confirm of external/privacy content. */
  consentAccepted?: boolean
  /** Heuristic: decline/reject or wander away from consent. */
  consentRejected?: boolean
  /** End-of-run or scorecard goalReached / success. */
  goalReached?: boolean
  /** Wall-clock seconds from first→last step timestamp (canvas compares to observeSeconds). */
  elapsedSeconds?: number | null
  evaluatedAt?: string | null
}

export type UxFlowGateEvaluation = {
  condition: UxFlowGateCondition
  matched: boolean
  evidence?: string | null
  gateNodeId?: string | null
}

/** Emitted when the agent replans onto a gate branch mid-run (one event per gate id). */
export type UxFlowReplanEvent = {
  gateNodeId: string
  edgeKind: 'when' | 'otherwise'
  condition: UxFlowGateCondition
  /** Next-segment task text (Phase 4 planner); historically full remaining when-branch. */
  remainingTask: string
  at: string
}

export type UxFlowCursor = {
  activeNodeId?: string | null
  activeEdgeKind?: UxFlowEdgeKind | null
  gateEvaluations?: UxFlowGateEvaluation[] | null
  /** Latest mid-run Live-Gate replan. */
  replan?: UxFlowReplanEvent | null
  /** Successive multi-gate replans (Phase 4); latest also mirrored on `replan`. */
  replanHistory?: UxFlowReplanEvent[] | null
}

/**
 * Minimal graph snapshot forwarded to the journey agent for mid-run Live-Gate replan.
 * Same node/edge shape as `UxTestFlow` — not a second product model.
 */
export type UxFlowGraphSnapshot = {
  id: string
  name?: string | null
  nodes: UxFlowNode[]
  edges: UxFlowEdge[]
}
