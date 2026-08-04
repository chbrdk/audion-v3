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
  /** Full graph when available (V1: scenarios 1–3); catalog-only entries may omit. */
  nodes?: UxFlowNode[] | null
  edges?: UxFlowEdge[] | null
  /** Hint success criteria when graph omitted or for pack compile override */
  successCriteria?: UxSuccessCriteria | null
  defaultWaveKey: string
  /** Whether compile to agent study is supported in V1 */
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
