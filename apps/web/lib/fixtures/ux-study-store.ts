/**
 * UX study / wave persistence facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 */
import type {
  SoftScoreEntry,
  SoftScoreKey,
  UxCompareAggregateDelta,
  UxHypothesisResult,
  UxStudyDetail,
  UxStudyList,
  UxStudyWritePayload,
  UxWaveCompareDelta,
  UxWaveDetail,
  UxWaveEvaluation,
  UxWaveRunItem,
  UxWaveSummary,
  UxWaveWritePayload,
} from '@audion-v3/contracts'
import { isProjectsDatabaseConfigured } from '../db/config'
import { DEMO_UX_STUDIES, DEMO_UX_WAVES } from './ux-studies'

export { buildWaveReportMarkdown } from '../ux-wave-report'

async function dbApi() {
  return import('../db/ux-studies')
}

let studies: UxStudyDetail[] = DEMO_UX_STUDIES.map((s) => structuredClone(s))
let waves: UxWaveDetail[] = DEMO_UX_WAVES.map((w) => structuredClone(w))

export function resetUxStudyStore(): void {
  studies = DEMO_UX_STUDIES.map((s) => structuredClone(s))
  waves = DEMO_UX_WAVES.map((w) => structuredClone(w))
}

function waveSummary(wave: UxWaveDetail): UxWaveSummary {
  return {
    id: wave.id,
    waveKey: wave.waveKey,
    status: wave.status,
    studyId: wave.studyId,
    runCount: wave.runs.length,
    validEvidenceCount: wave.runs.filter((r) => r.validEvidence === true).length,
    updatedAt: wave.updatedAt,
  }
}

function withStudyWaves(study: UxStudyDetail): UxStudyDetail {
  const studyWaves = waves.filter((w) => w.studyId === study.id).map(waveSummary)
  return {
    ...study,
    waveCount: studyWaves.length,
    waves: studyWaves,
  }
}

function memoryUxStudyList(): UxStudyList {
  const items = studies.map((s) => {
    const detail = withStudyWaves(s)
    const { description: _d, hypothesisTemplates: _h, waves: _w, ...summary } = detail
    return summary
  })
  return { items, total: items.length, page: 1, pageSize: 50 }
}

function memoryUxStudyDetail(id: string): UxStudyDetail | null {
  const found = studies.find((s) => s.id === id)
  return found ? withStudyWaves(found) : null
}

function memoryUxWaveDetail(studyId: string, waveId: string): UxWaveDetail | null {
  const found = waves.find((w) => w.id === waveId && w.studyId === studyId)
  if (!found) return null
  return {
    ...found,
    ...waveSummary(found),
    evaluation: found.evaluation,
    runs: found.runs,
    reportMarkdown: found.reportMarkdown ?? null,
    reportUpdatedAt: found.reportUpdatedAt ?? null,
  }
}

function memoryCreateUxStudy(payload: UxStudyWritePayload): UxStudyDetail {
  const id = `study-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const created: UxStudyDetail = {
    id,
    name: payload.name.trim(),
    status: payload.status ?? 'draft',
    projectId: payload.projectId ?? null,
    sourceGuide: payload.sourceGuide ?? null,
    targetUrlKey: payload.targetUrlKey ?? null,
    waveCount: 0,
    updatedAt: new Date().toISOString(),
    description: payload.description ?? null,
    hypothesisTemplates: payload.hypothesisTemplates ?? [],
    waves: [],
  }
  studies = [created, ...studies]
  return withStudyWaves(created)
}

function memoryPatchUxStudy(
  id: string,
  payload: Partial<UxStudyWritePayload>,
): UxStudyDetail | null {
  const index = studies.findIndex((s) => s.id === id)
  if (index < 0) return null
  const current = studies[index]!
  const next: UxStudyDetail = {
    ...current,
    name: payload.name?.trim() ?? current.name,
    status: payload.status ?? current.status,
    description: payload.description !== undefined ? payload.description : current.description,
    projectId: payload.projectId !== undefined ? payload.projectId : current.projectId,
    sourceGuide: payload.sourceGuide !== undefined ? payload.sourceGuide : current.sourceGuide,
    targetUrlKey: payload.targetUrlKey !== undefined ? payload.targetUrlKey : current.targetUrlKey,
    hypothesisTemplates:
      payload.hypothesisTemplates !== undefined
        ? payload.hypothesisTemplates
        : current.hypothesisTemplates,
    updatedAt: new Date().toISOString(),
  }
  studies = [...studies.slice(0, index), next, ...studies.slice(index + 1)]
  return withStudyWaves(next)
}

function normalizeRun(
  partial: Partial<UxWaveRunItem> & { runKey: string; url: string; task: string },
  index: number,
): UxWaveRunItem {
  return {
    id: partial.id ?? `run-${partial.runKey}-${index}`,
    runKey: partial.runKey,
    leitfadenBlock: partial.leitfadenBlock ?? null,
    personaId: partial.personaId ?? null,
    personaName: partial.personaName ?? null,
    segment: partial.segment ?? null,
    url: partial.url,
    task: partial.task,
    maxSteps: partial.maxSteps ?? null,
    jobId: partial.jobId ?? null,
    agentStatus: partial.agentStatus ?? null,
    agentSuccess: partial.agentSuccess ?? null,
    taskCompleted: partial.taskCompleted ?? null,
    validEvidence: partial.validEvidence ?? null,
    validEvidenceCaveat: partial.validEvidenceCaveat ?? null,
    blockers: partial.blockers ?? [],
    steps: partial.steps ?? null,
    frictionScore: partial.frictionScore ?? null,
    personaFitScore: partial.personaFitScore ?? null,
    goalReached: partial.goalReached ?? null,
    finding: partial.finding ?? null,
    categories: partial.categories ?? {},
  }
}

function memoryCreateUxWave(
  studyId: string,
  payload: UxWaveWritePayload,
): UxWaveDetail | null {
  if (!studies.some((s) => s.id === studyId)) return null
  const id = `wave-${payload.waveKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
  const runs = (payload.runs ?? []).map((r, i) => normalizeRun(r, i))
  const created: UxWaveDetail = {
    id,
    waveKey: payload.waveKey.trim(),
    status: payload.status ?? 'draft',
    studyId,
    runCount: runs.length,
    validEvidenceCount: runs.filter((r) => r.validEvidence === true).length,
    updatedAt: new Date().toISOString(),
    evaluation: (payload.evaluation as UxWaveEvaluation | null | undefined) ?? null,
    runs,
    reportMarkdown: payload.reportMarkdown ?? null,
    reportUpdatedAt: payload.reportMarkdown ? new Date().toISOString() : null,
  }
  waves = [created, ...waves]
  const study = studies.find((s) => s.id === studyId)!
  study.updatedAt = created.updatedAt
  return created
}

function mean(nums: number[]): number | null {
  if (!nums.length) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/** Recompute evaluation from validEvidence runs (rule-based Phase 1). */
export function evaluateUxWaveFromRuns(
  studyId: string,
  waveId: string,
  runs: UxWaveRunItem[],
  hypotheses: UxHypothesisResult[] | null,
): UxWaveEvaluation {
  const valid = runs.filter((r) => r.validEvidence === true)
  const completed = runs.filter((r) => r.taskCompleted === true)
  const blocked = runs.filter((r) => (r.blockers?.length ?? 0) > 0)
  const segmentsCovered = [...new Set(valid.map((r) => r.segment).filter(Boolean))] as string[]
  const allSegments = [...new Set(runs.map((r) => r.segment).filter(Boolean))] as string[]
  const segmentsMissing = allSegments.filter((s) => !segmentsCovered.includes(s))

  const preserved =
    hypotheses?.map((h) => ({
      ...h,
      evidenceRunIds: h.evidenceRunIds.filter((id) =>
        valid.some((r) => r.runKey === id || r.id === id),
      ),
    })) ?? []

  return {
    schemaVersion: '1.0.0',
    studyId,
    waveId,
    evaluatedAt: new Date().toISOString(),
    method: 'audion_ux_journey_agent',
    aggregate: {
      runsTotal: runs.length,
      runsTaskCompleted: completed.length,
      runsValidEvidence: valid.length,
      taskCompletionRate: runs.length ? completed.length / runs.length : 0,
      validEvidenceRate: runs.length ? valid.length / runs.length : 0,
      infrastructureBlockRate: runs.length ? blocked.length / runs.length : 0,
      meanFrictionValidOnly: mean(
        valid.map((r) => r.frictionScore).filter((n): n is number => typeof n === 'number'),
      ),
      meanPersonaFitValidOnly: mean(
        valid.map((r) => r.personaFitScore).filter((n): n is number => typeof n === 'number'),
      ),
      goalReachedRateValidOnly: valid.length
        ? valid.filter((r) => r.goalReached === true).length / valid.length
        : null,
      segmentsCoveredWithValidEvidence: segmentsCovered,
      segmentsMissingValidEvidence: segmentsMissing,
    },
    hypotheses: preserved,
    softScores: { basis: 'validEvidence-only rule recompute; soft Q preserved when present' },
    notes: [
      'Evaluate aggregates only validEvidence=true runs for friction/fit/goal rates.',
      'Hypothesis verdicts preserved from prior evaluation when present.',
    ],
  }
}

function memoryPatchUxWave(
  studyId: string,
  waveId: string,
  payload: UxWaveWritePayload,
): UxWaveDetail | null {
  const index = waves.findIndex((w) => w.id === waveId && w.studyId === studyId)
  if (index < 0) return null
  const current = waves[index]!
  let runs = current.runs
  if (payload.runs?.length) {
    const byKey = new Map(current.runs.map((r) => [r.runKey, r]))
    for (const partial of payload.runs) {
      const existing = byKey.get(partial.runKey)
      if (existing) {
        byKey.set(partial.runKey, {
          ...existing,
          ...partial,
          categories: partial.categories ?? existing.categories,
        })
      } else {
        byKey.set(partial.runKey, normalizeRun(partial, byKey.size))
      }
    }
    runs = [...byKey.values()]
  }
  let evaluation = current.evaluation
  if (payload.evaluation) {
    evaluation = {
      ...(current.evaluation ?? {
        schemaVersion: '1.0.0',
        studyId,
        waveId,
        evaluatedAt: null,
        method: 'audion_ux_journey_agent',
        aggregate: {
          runsTotal: runs.length,
          runsTaskCompleted: 0,
          runsValidEvidence: 0,
          taskCompletionRate: 0,
          validEvidenceRate: 0,
          infrastructureBlockRate: 0,
          meanFrictionValidOnly: null,
          meanPersonaFitValidOnly: null,
          goalReachedRateValidOnly: null,
          segmentsCoveredWithValidEvidence: [],
          segmentsMissingValidEvidence: [],
        },
        hypotheses: [],
        softScores: {},
        notes: [],
      }),
      ...payload.evaluation,
      softScores: {
        ...(current.evaluation?.softScores ?? {}),
        ...(payload.evaluation.softScores ?? {}),
      },
      hypotheses: payload.evaluation.hypotheses ?? current.evaluation?.hypotheses ?? [],
    }
  }
  const reportMarkdown =
    payload.reportMarkdown !== undefined ? payload.reportMarkdown : current.reportMarkdown
  const next: UxWaveDetail = {
    ...current,
    waveKey: payload.waveKey?.trim() || current.waveKey,
    status: payload.status ?? current.status,
    runs,
    evaluation,
    reportMarkdown: reportMarkdown ?? null,
    reportUpdatedAt:
      payload.reportMarkdown !== undefined
        ? new Date().toISOString()
        : (current.reportUpdatedAt ?? null),
    updatedAt: new Date().toISOString(),
  }
  const summarized = { ...next, ...waveSummary(next) }
  waves = [...waves.slice(0, index), summarized, ...waves.slice(index + 1)]
  return summarized
}

function memoryStartUxWave(studyId: string, waveId: string): UxWaveDetail | null {
  const index = waves.findIndex((w) => w.id === waveId && w.studyId === studyId)
  if (index < 0) return null
  const current = waves[index]!
  const runs = current.runs.map((r) => ({
    ...r,
    jobId: r.jobId ?? `job-fixture-${r.runKey}`,
    agentStatus: r.agentStatus === 'complete' ? r.agentStatus : 'running',
  }))
  const next: UxWaveDetail = {
    ...current,
    ...waveSummary({ ...current, status: 'running', runs }),
    status: 'running',
    runs,
    updatedAt: new Date().toISOString(),
  }
  waves = [...waves.slice(0, index), next, ...waves.slice(index + 1)]
  return next
}

function memorySyncUxWave(studyId: string, waveId: string): UxWaveDetail | null {
  const index = waves.findIndex((w) => w.id === waveId && w.studyId === studyId)
  if (index < 0) return null
  const current = waves[index]!
  let advanced = false
  const runs = current.runs.map((r) => {
    if (r.agentStatus === 'complete') return r
    if (r.agentStatus === 'running' || current.status === 'running') {
      advanced = true
      // A-* ≈ Erstkontakt 403; other keys get fixture-valid evidence
      const infraBlocked = r.runKey.startsWith('A-')
      const taskCompleted = !infraBlocked
      const agentSuccess = !infraBlocked
      const blockers = infraBlocked ? ['cloudfront_403'] : []
      return {
        ...r,
        agentStatus: 'complete' as const,
        agentSuccess,
        taskCompleted,
        validEvidence: taskCompleted,
        validEvidenceCaveat: infraBlocked
          ? null
          : r.validEvidenceCaveat ?? null,
        blockers,
        goalReached: taskCompleted,
        frictionScore: r.frictionScore ?? (taskCompleted ? 8 : 10),
        personaFitScore: r.personaFitScore ?? (taskCompleted ? 2 : 0),
        finding:
          r.finding ??
          (taskCompleted
            ? 'Fixture sync completed run.'
            : 'Fixture sync: infrastructure blocked (403).'),
      }
    }
    return r
  })
  const allDone = runs.every((r) => r.agentStatus === 'complete')
  const status = allDone ? 'complete' : current.status === 'draft' && !advanced ? 'draft' : 'running'
  const next: UxWaveDetail = {
    ...current,
    ...waveSummary({ ...current, status, runs }),
    status,
    runs,
    updatedAt: new Date().toISOString(),
  }
  waves = [...waves.slice(0, index), next, ...waves.slice(index + 1)]
  return next
}

function memoryPatchUxWaveRuns(
  studyId: string,
  waveId: string,
  runs: UxWaveRunItem[],
): UxWaveDetail | null {
  const index = waves.findIndex((w) => w.id === waveId && w.studyId === studyId)
  if (index < 0) return null
  const current = waves[index]!
  const allDone = runs.every((r) => r.agentStatus === 'complete')
  const status = allDone ? 'complete' : 'running'
  const next: UxWaveDetail = {
    ...current,
    ...waveSummary({ ...current, status, runs }),
    status,
    runs,
    updatedAt: new Date().toISOString(),
  }
  waves = [...waves.slice(0, index), next, ...waves.slice(index + 1)]
  return next
}

function memoryMarkRunDerivedJourney(
  studyId: string,
  waveId: string,
  runKey: string,
  journeyId: string,
): UxWaveDetail | null {
  const index = waves.findIndex((w) => w.id === waveId && w.studyId === studyId)
  if (index < 0) return null
  const current = waves[index]!
  const runs = current.runs.map((r) =>
    r.runKey === runKey ? { ...r, derivedJourneyId: journeyId } : r,
  )
  const next: UxWaveDetail = {
    ...current,
    ...waveSummary({ ...current, runs }),
    runs,
    updatedAt: new Date().toISOString(),
  }
  waves = [...waves.slice(0, index), next, ...waves.slice(index + 1)]
  return next
}

function memoryEvaluateUxWave(studyId: string, waveId: string): UxWaveDetail | null {
  const index = waves.findIndex((w) => w.id === waveId && w.studyId === studyId)
  if (index < 0) return null
  const current = waves[index]!
  const evaluation = evaluateUxWaveFromRuns(
    studyId,
    waveId,
    current.runs,
    current.evaluation?.hypotheses ?? null,
  )
  if (current.evaluation?.softScores) {
    evaluation.softScores = {
      ...current.evaluation.softScores,
      basis: current.evaluation.softScores.basis ?? evaluation.softScores.basis,
    }
  }
  const status = current.status === 'draft' ? 'complete' : current.status
  const next: UxWaveDetail = {
    ...current,
    ...waveSummary({ ...current, status, evaluation, runs: current.runs }),
    status,
    evaluation,
    updatedAt: new Date().toISOString(),
  }
  waves = [...waves.slice(0, index), next, ...waves.slice(index + 1)]
  return next
}

function softNum(ev: UxWaveEvaluation | null, key: SoftScoreKey): number | null {
  const block = ev?.softScores?.[key] as SoftScoreEntry | undefined
  const val = block?.value
  return typeof val === 'number' ? val : null
}

function deltaRow(baseline: number | null, current: number | null): UxCompareAggregateDelta {
  return {
    baseline,
    current,
    delta:
      typeof baseline === 'number' && typeof current === 'number' ? current - baseline : null,
  }
}

function memoryCompareUxWaves(
  studyId: string,
  waveId: string,
  otherWaveId: string,
): UxWaveCompareDelta | null {
  const baseline = memoryUxWaveDetail(studyId, otherWaveId)
  const current = memoryUxWaveDetail(studyId, waveId)
  if (!baseline || !current) return null
  const ba = baseline.evaluation?.aggregate
  const ca = current.evaluation?.aggregate
  const aggKeys = [
    'taskCompletionRate',
    'validEvidenceRate',
    'infrastructureBlockRate',
    'meanFrictionValidOnly',
    'meanPersonaFitValidOnly',
    'runsTaskCompleted',
    'runsValidEvidence',
  ] as const
  const aggregateDelta: Record<string, UxCompareAggregateDelta> = {}
  for (const k of aggKeys) {
    const b = ba ? (ba[k] as number | null) : null
    const c = ca ? (ca[k] as number | null) : null
    aggregateDelta[k] = deltaRow(
      typeof b === 'number' ? b : null,
      typeof c === 'number' ? c : null,
    )
  }

  const softKeys: SoftScoreKey[] = [
    'Q1_nuetzlichkeit',
    'Q2_bedienbarkeit',
    'Q3_filterlogik',
    'Q6_nutzungswahrscheinlichkeit',
    'Q7_gesamteindruck',
  ]
  const softScoreDelta: Record<string, UxCompareAggregateDelta> = {}
  for (const k of softKeys) {
    softScoreDelta[k] = deltaRow(
      softNum(baseline.evaluation, k),
      softNum(current.evaluation, k),
    )
  }

  const bh = new Map((baseline.evaluation?.hypotheses ?? []).map((h) => [h.id, h]))
  const ch = new Map((current.evaluation?.hypotheses ?? []).map((h) => [h.id, h]))
  const hypIds = [...new Set([...bh.keys(), ...ch.keys()])].sort()
  const hypothesisDelta = hypIds.map((id) => {
    const b = bh.get(id)
    const c = ch.get(id)
    const bs = b?.score ?? null
    const cs = c?.score ?? null
    return {
      id,
      baselineVerdict: b?.verdict ?? null,
      currentVerdict: c?.verdict ?? null,
      changed: (b?.verdict ?? null) !== (c?.verdict ?? null),
      baselineScore: bs,
      currentScore: cs,
      scoreDelta:
        typeof bs === 'number' && typeof cs === 'number' ? cs - bs : null,
    }
  })

  const br = new Map(baseline.runs.map((r) => [r.runKey, r]))
  const cr = new Map(current.runs.map((r) => [r.runKey, r]))
  const runKeys = [...new Set([...br.keys(), ...cr.keys()])].sort()
  const runDelta = runKeys.map((runId) => {
    const b = br.get(runId)
    const c = cr.get(runId)
    const bf = b?.frictionScore ?? null
    const cf = c?.frictionScore ?? null
    return {
      runId,
      baselineValid: b?.validEvidence ?? null,
      currentValid: c?.validEvidence ?? null,
      baselineTaskCompleted: b?.taskCompleted ?? null,
      currentTaskCompleted: c?.taskCompleted ?? null,
      baselineFriction: bf,
      currentFriction: cf,
      frictionDelta:
        typeof bf === 'number' && typeof cf === 'number' ? cf - bf : null,
    }
  })

  const improved: string[] = []
  const worsened: string[] = []
  const betterWhenHigher = new Set([
    'taskCompletionRate',
    'validEvidenceRate',
    'meanPersonaFitValidOnly',
  ])
  const betterWhenLower = new Set(['infrastructureBlockRate', 'meanFrictionValidOnly'])
  for (const [k, row] of Object.entries(aggregateDelta)) {
    if (row.delta == null) continue
    if (betterWhenHigher.has(k)) {
      if (row.delta > 0) improved.push(k)
      if (row.delta < 0) worsened.push(k)
    }
    if (betterWhenLower.has(k)) {
      if (row.delta < 0) improved.push(k)
      if (row.delta > 0) worsened.push(k)
    }
  }

  const summary =
    waveId === otherWaveId
      ? 'Self-compare: all numeric deltas are 0 when evaluation is identical.'
      : `Compared ${current.waveKey} vs baseline ${baseline.waveKey}.`

  return {
    baselineWaveId: otherWaveId,
    currentWaveId: waveId,
    aggregateDelta,
    softScoreDelta,
    hypothesisDelta,
    runDelta,
    improved,
    worsened,
    summary,
  }
}

export async function storeUxStudyList(): Promise<UxStudyList> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbUxStudyList()
  }
  return memoryUxStudyList()
}

export async function storeUxStudyDetail(id: string): Promise<UxStudyDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbUxStudyDetail(id)
  }
  return memoryUxStudyDetail(id)
}

export async function storeUxWaveDetail(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbUxWaveDetail(studyId, waveId)
  }
  return memoryUxWaveDetail(studyId, waveId)
}

export async function storeCreateUxStudy(payload: UxStudyWritePayload): Promise<UxStudyDetail> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbCreateUxStudy(payload)
  }
  return memoryCreateUxStudy(payload)
}

export async function storePatchUxStudy(
  id: string,
  payload: Partial<UxStudyWritePayload>,
): Promise<UxStudyDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPatchUxStudy(id, payload)
  }
  return memoryPatchUxStudy(id, payload)
}

export async function storeCreateUxWave(
  studyId: string,
  payload: UxWaveWritePayload,
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbCreateUxWave(studyId, payload)
  }
  return memoryCreateUxWave(studyId, payload)
}

export async function storePatchUxWave(
  studyId: string,
  waveId: string,
  payload: UxWaveWritePayload,
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPatchUxWave(studyId, waveId, payload)
  }
  return memoryPatchUxWave(studyId, waveId, payload)
}

export async function storeStartUxWave(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbStartUxWave(studyId, waveId)
  }
  return memoryStartUxWave(studyId, waveId)
}

export async function storeSyncUxWave(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbSyncUxWave(studyId, waveId)
  }
  return memorySyncUxWave(studyId, waveId)
}

export async function storePatchUxWaveRuns(
  studyId: string,
  waveId: string,
  runs: UxWaveRunItem[],
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbPatchUxWaveRuns(studyId, waveId, runs)
  }
  return memoryPatchUxWaveRuns(studyId, waveId, runs)
}

export async function storeMarkRunDerivedJourney(
  studyId: string,
  waveId: string,
  runKey: string,
  journeyId: string,
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbMarkRunDerivedJourney(studyId, waveId, runKey, journeyId)
  }
  return memoryMarkRunDerivedJourney(studyId, waveId, runKey, journeyId)
}

export async function storeEvaluateUxWave(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbEvaluateUxWave(studyId, waveId)
  }
  return memoryEvaluateUxWave(studyId, waveId)
}

export async function storeCompareUxWaves(
  studyId: string,
  waveId: string,
  otherWaveId: string,
): Promise<UxWaveCompareDelta | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbCompareUxWaves(studyId, waveId, otherWaveId)
  }
  return memoryCompareUxWaves(studyId, waveId, otherWaveId)
}
