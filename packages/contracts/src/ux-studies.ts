/** UX Study / Wave contracts — Testbirds-like study workflow (Phase 3). */

export type UxStudyStatus = 'draft' | 'active' | 'archived'
export type UxWaveStatus = 'draft' | 'running' | 'complete' | 'failed'
export type UxHypothesisVerdict =
  | 'supported'
  | 'partially_supported'
  | 'inconclusive'
  | 'refuted'
  | 'not_tested'

export type UxHypothesisTemplate = {
  id: string
  statement: string
}

export type SoftScoreCoreKey =
  | 'ease'
  | 'findability'
  | 'clarity'
  | 'usefulness'
  | 'likelihood'
  | 'overall'

/** Legacy EBM / Testbirds Soft-Q keys — domain profile `ebm-produktkombinationen`. */
export type SoftScoreEbmKey =
  | 'Q1_nuetzlichkeit'
  | 'Q2_bedienbarkeit'
  | 'Q3_filterlogik'
  | 'Q4_auffindbarkeit'
  | 'Q5_produktnah_vs_tool'
  | 'Q6_nutzungswahrscheinlichkeit'
  | 'Q7_gesamteindruck'

export type SoftScoreKey = SoftScoreCoreKey | SoftScoreEbmKey

/** Domain Soft-Q profile id — maps core scales onto product keys. */
export type SoftScoreDomainProfileId = 'ebm-produktkombinationen' | 'core'

export const SOFT_SCORE_CORE_KEYS: SoftScoreCoreKey[] = [
  'ease',
  'findability',
  'clarity',
  'usefulness',
  'likelihood',
  'overall',
]

export const SOFT_SCORE_EBM_KEYS: SoftScoreEbmKey[] = [
  'Q1_nuetzlichkeit',
  'Q2_bedienbarkeit',
  'Q3_filterlogik',
  'Q4_auffindbarkeit',
  'Q5_produktnah_vs_tool',
  'Q6_nutzungswahrscheinlichkeit',
  'Q7_gesamteindruck',
]

/** Core → EBM Soft-Q alias (profile `ebm-produktkombinationen`). */
export const SOFT_SCORE_CORE_TO_EBM: Record<SoftScoreCoreKey, SoftScoreEbmKey> = {
  usefulness: 'Q1_nuetzlichkeit',
  ease: 'Q2_bedienbarkeit',
  clarity: 'Q3_filterlogik',
  findability: 'Q4_auffindbarkeit',
  // Q5 is choice-scale product-near; map overall preference pressure to usefulness band
  likelihood: 'Q6_nutzungswahrscheinlichkeit',
  overall: 'Q7_gesamteindruck',
}

export type UxLabArchetype =
  | 'first_impression'
  | 'findability'
  | 'task_goal'
  | 'comprehension'
  | 'segment_contrast'
  | 'outcome_next_step'
  | 'recovery'
  | 'end_to_end'

export type UxSuccessCriteriaKind =
  | 'url_match'
  | 'title_match'
  | 'goal_text'
  | 'honest_abandon'

export type UxSuccessCriteria = {
  kind: UxSuccessCriteriaKind
  /** Regex source for url/title/goal_text matches. */
  pattern?: string | null
}
export type UxStudySummary = {
  id: string
  name: string
  status: UxStudyStatus
  projectId: string | null
  sourceGuide: string | null
  targetUrlKey: string | null
  waveCount: number
  updatedAt: string | null
}

export type UxStudyList = {
  items: UxStudySummary[]
  total: number
  page: number
  pageSize: number
}

export type UxWaveRunItem = {
  id: string
  runKey: string
  leitfadenBlock: string | null
  personaId: string | null
  personaName: string | null
  segment: string | null
  url: string
  task: string
  maxSteps: number | null
  jobId: string | null
  agentStatus: string | null
  agentSuccess: boolean | null
  taskCompleted: boolean | null
  validEvidence: boolean | null
  validEvidenceCaveat: string | null
  blockers: string[]
  steps: number | null
  frictionScore: number | null
  personaFitScore: number | null
  goalReached: boolean | null
  finding: string | null
  categories: Record<string, number>
  /** Final browser URL from agent job (path-finding / H3 proof). */
  finalUrl?: string | null
  /** Final document title when the agent captured it. */
  finalTitle?: string | null
  /**
   * Path-finding honesty: true when navigate/go_to_url jumped to the target.
   * false = UI path only; null = not a path-finding run / unknown.
   */
  deeplinkCheat?: boolean | null
  /** Set after Convert to Journey (fixture or live). */
  derivedJourneyId?: string | null
}

export type SoftScoreEntry = {
  scale: string
  value: number | string | null
  confidence: number
  rationale: string
}

export type UxHypothesisResult = {
  id: string
  statement: string
  verdict: UxHypothesisVerdict
  confidence: number
  score: number | null
  evidenceRunIds: string[]
  rationale: string
}

export type UxWaveAggregate = {
  runsTotal: number
  runsTaskCompleted: number
  runsValidEvidence: number
  taskCompletionRate: number
  validEvidenceRate: number
  infrastructureBlockRate: number
  meanFrictionValidOnly: number | null
  meanPersonaFitValidOnly: number | null
  goalReachedRateValidOnly: number | null
  segmentsCoveredWithValidEvidence: string[]
  segmentsMissingValidEvidence: string[]
}

export type UxWaveEvaluation = {
  schemaVersion: string
  studyId: string
  waveId: string
  evaluatedAt: string | null
  method: string
  aggregate: UxWaveAggregate
  hypotheses: UxHypothesisResult[]
  softScores: Partial<Record<SoftScoreKey, SoftScoreEntry>> & {
    basis?: string
  }
  notes: string[]
}

export type UxWaveSummary = {
  id: string
  waveKey: string
  status: UxWaveStatus
  studyId: string
  runCount: number
  validEvidenceCount: number
  updatedAt: string | null
}

export type UxWaveDetail = UxWaveSummary & {
  evaluation: UxWaveEvaluation | null
  runs: UxWaveRunItem[]
  reportMarkdown: string | null
  reportUpdatedAt: string | null
}

export type UxStudyDetail = UxStudySummary & {
  description: string | null
  hypothesisTemplates: UxHypothesisTemplate[]
  waves: UxWaveSummary[]
}

export type UxStudyWritePayload = {
  name: string
  status?: UxStudyStatus
  description?: string | null
  projectId?: string | null
  sourceGuide?: string | null
  targetUrlKey?: string | null
  hypothesisTemplates?: UxHypothesisTemplate[]
}

export type UxWaveWritePayload = {
  waveKey: string
  status?: UxWaveStatus
  reportMarkdown?: string | null
  runs?: Array<Partial<UxWaveRunItem> & { runKey: string; url: string; task: string }>
  evaluation?: Partial<UxWaveEvaluation> | null
}

export type UxWaveStartResult = {
  studyId: string
  waveId: string
  status: UxWaveStatus
  started: Array<{ runKey: string; jobId: string | null; skipped?: boolean }>
}

export type UxWaveSyncResult = {
  studyId: string
  waveId: string
  status: UxWaveStatus
  runs: UxWaveRunItem[]
}

export type UxCompareAggregateDelta = {
  baseline: number | null
  current: number | null
  delta: number | null
}

export type UxWaveCompareDelta = {
  baselineWaveId: string
  currentWaveId: string
  aggregateDelta: Record<string, UxCompareAggregateDelta>
  softScoreDelta: Record<string, UxCompareAggregateDelta>
  hypothesisDelta: Array<{
    id: string
    baselineVerdict: string | null
    currentVerdict: string | null
    changed: boolean
    baselineScore: number | null
    currentScore: number | null
    scoreDelta: number | null
  }>
  runDelta: Array<{
    runId: string
    baselineValid: boolean | null
    currentValid: boolean | null
    baselineTaskCompleted: boolean | null
    currentTaskCompleted: boolean | null
    baselineFriction: number | null
    currentFriction: number | null
    frictionDelta: number | null
  }>
  improved: string[]
  worsened: string[]
  summary: string
}

/** Reusable Leitfaden → Study/Wave seed (no PDF parsing). */
export type UxScenarioPackRun = {
  runKey: string
  leitfadenBlock: string | null
  /** Fixture persona id */
  personaId: string
  personaName: string | null
  segment: string | null
  /** Opaque URL key resolved via registry (`paths` / resolveScenarioPackUrl). */
  urlKey: string
  task: string
  maxSteps: number
  /** Optional per-run success criteria (overrides pack-level when set). */
  successCriteria?: UxSuccessCriteria | null
  /** Optional per-run archetype when pack has mixed slices (e.g. A+C). */
  archetype?: UxLabArchetype | null
}

export type UxScenarioPack = {
  id: string
  name: string
  description: string | null
  sourceGuide: string | null
  targetUrlKey: string
  projectId: string | null
  hypothesisTemplates: UxHypothesisTemplate[]
  softScoreKeys: SoftScoreKey[]
  /** Soft-Q domain profile; EBM packs use `ebm-produktkombinationen`. */
  domainProfileId?: SoftScoreDomainProfileId | null
  /** Primary lab archetype for this pack. */
  archetype?: UxLabArchetype | null
  /** Default success criteria (findability URL pattern, etc.). */
  successCriteria?: UxSuccessCriteria | null
  fFragenPrompts: string[]
  defaultWaveKey: string
  runs: UxScenarioPackRun[]
}

export type UxScenarioPackSummary = {
  id: string
  name: string
  sourceGuide: string | null
  targetUrlKey: string
  runCount: number
  archetype?: UxLabArchetype | null
}

export type UxStudyFromPackPayload = {
  packId: string
  /** Optional override study name */
  name?: string
  projectId?: string | null
  waveKey?: string
}

export type UxStudyFromPackResult = {
  study: UxStudyDetail
  wave: UxWaveDetail
  packId: string
}
