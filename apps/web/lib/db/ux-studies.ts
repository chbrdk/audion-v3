import { desc, eq } from 'drizzle-orm'
import type {
  SoftScoreEntry,
  SoftScoreKey,
  UxCompareAggregateDelta,
  UxStudyDetail,
  UxStudyList,
  UxStudyStatus,
  UxStudyWritePayload,
  UxWaveCompareDelta,
  UxWaveDetail,
  UxWaveEvaluation,
  UxWaveRunItem,
  UxWaveStatus,
  UxWaveSummary,
  UxWaveWritePayload,
} from '@audion-v3/contracts'
import { getDb } from './client'
import { uxStudies, uxWaves, type UxStudyRow, type UxWaveRow } from './schema'

function normalizeStudyStatus(value: string | null | undefined): UxStudyStatus {
  if (value === 'archived' || value === 'active' || value === 'draft') return value
  return 'draft'
}

function normalizeWaveStatus(value: string | null | undefined): UxWaveStatus {
  if (value === 'running' || value === 'complete' || value === 'failed' || value === 'draft') {
    return value
  }
  return 'draft'
}

export function waveSummaryFromDetail(wave: {
  id: string
  waveKey: string
  status: UxWaveStatus
  studyId: string
  runs: UxWaveRunItem[]
  updatedAt: string | null
}): UxWaveSummary {
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

function waveRowToDetail(row: UxWaveRow): UxWaveDetail {
  const runs = Array.isArray(row.runs) ? row.runs : []
  const base = {
    id: row.id,
    waveKey: row.waveKey,
    status: normalizeWaveStatus(row.status),
    studyId: row.studyId,
    runs,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  }
  return {
    ...base,
    ...waveSummaryFromDetail(base),
    evaluation: row.evaluation ?? null,
    reportMarkdown: row.reportMarkdown ?? null,
    reportUpdatedAt: row.reportUpdatedAt?.toISOString() ?? null,
  }
}

function studyRowToBase(row: UxStudyRow): Omit<UxStudyDetail, 'waveCount' | 'waves'> {
  return {
    id: row.id,
    name: row.name,
    status: normalizeStudyStatus(row.status),
    projectId: row.projectId ?? null,
    sourceGuide: row.sourceGuide ?? null,
    targetUrlKey: row.targetUrlKey ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    description: row.description ?? null,
    hypothesisTemplates: row.hypothesisTemplates ?? [],
  }
}

async function wavesForStudy(studyId: string): Promise<UxWaveDetail[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(uxWaves)
    .where(eq(uxWaves.studyId, studyId))
    .orderBy(desc(uxWaves.updatedAt))
  return rows.map(waveRowToDetail)
}

async function withStudyWaves(row: UxStudyRow): Promise<UxStudyDetail> {
  const studyWaves = (await wavesForStudy(row.id)).map(waveSummaryFromDetail)
  return {
    ...studyRowToBase(row),
    waveCount: studyWaves.length,
    waves: studyWaves,
  }
}

function toStudySummary(detail: UxStudyDetail) {
  const { description: _d, hypothesisTemplates: _h, waves: _w, ...summary } = detail
  return summary
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
    finalUrl: partial.finalUrl ?? null,
    finalTitle: partial.finalTitle ?? null,
    deeplinkCheat: partial.deeplinkCheat ?? null,
    derivedJourneyId: partial.derivedJourneyId,
    flowGraph: partial.flowGraph ?? null,
  }
}

async function persistWave(detail: UxWaveDetail): Promise<UxWaveDetail> {
  const db = getDb()
  const summary = waveSummaryFromDetail(detail)
  const next: UxWaveDetail = { ...detail, ...summary }
  await db
    .update(uxWaves)
    .set({
      waveKey: next.waveKey,
      status: next.status,
      runs: next.runs,
      evaluation: next.evaluation,
      reportMarkdown: next.reportMarkdown,
      reportUpdatedAt: next.reportUpdatedAt ? new Date(next.reportUpdatedAt) : null,
      updatedAt: new Date(next.updatedAt ?? Date.now()),
    })
    .where(eq(uxWaves.id, next.id))
  return next
}

async function touchStudy(studyId: string, updatedAt: string): Promise<void> {
  const db = getDb()
  await db
    .update(uxStudies)
    .set({ updatedAt: new Date(updatedAt) })
    .where(eq(uxStudies.id, studyId))
}

export async function dbUxStudyList(): Promise<UxStudyList> {
  const db = getDb()
  const rows = await db.select().from(uxStudies).orderBy(desc(uxStudies.updatedAt))
  const items = await Promise.all(rows.map(async (row) => toStudySummary(await withStudyWaves(row))))
  return { items, total: items.length, page: 1, pageSize: Math.max(50, items.length) }
}

export async function dbUxStudyDetail(id: string): Promise<UxStudyDetail | null> {
  const db = getDb()
  const rows = await db.select().from(uxStudies).where(eq(uxStudies.id, id)).limit(1)
  const row = rows[0]
  return row ? withStudyWaves(row) : null
}

export async function dbUxWaveDetail(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(uxWaves)
    .where(eq(uxWaves.id, waveId))
    .limit(1)
  const row = rows[0]
  if (!row || row.studyId !== studyId) return null
  return waveRowToDetail(row)
}

export async function dbCreateUxStudy(payload: UxStudyWritePayload): Promise<UxStudyDetail> {
  const id = `study-${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new'}-${Date.now().toString(36)}`
  const now = new Date()
  const db = getDb()
  await db.insert(uxStudies).values({
    id,
    name: payload.name.trim(),
    status: payload.status ?? 'draft',
    projectId: payload.projectId ?? null,
    sourceGuide: payload.sourceGuide ?? null,
    targetUrlKey: payload.targetUrlKey ?? null,
    description: payload.description ?? null,
    hypothesisTemplates: payload.hypothesisTemplates ?? [],
    updatedAt: now,
    createdAt: now,
  })
  const created = await dbUxStudyDetail(id)
  if (!created) throw new Error('Failed to create UX study')
  return created
}

export async function dbPatchUxStudy(
  id: string,
  payload: Partial<UxStudyWritePayload>,
): Promise<UxStudyDetail | null> {
  const current = await dbUxStudyDetail(id)
  if (!current) return null
  const db = getDb()
  await db
    .update(uxStudies)
    .set({
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
      updatedAt: new Date(),
    })
    .where(eq(uxStudies.id, id))
  return dbUxStudyDetail(id)
}

export async function dbCreateUxWave(
  studyId: string,
  payload: UxWaveWritePayload,
): Promise<UxWaveDetail | null> {
  const study = await dbUxStudyDetail(studyId)
  if (!study) return null
  const id = `wave-${payload.waveKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
  const runs = (payload.runs ?? []).map((r, i) => normalizeRun(r, i))
  const now = new Date()
  const created: UxWaveDetail = {
    id,
    waveKey: payload.waveKey.trim(),
    status: payload.status ?? 'draft',
    studyId,
    runCount: runs.length,
    validEvidenceCount: runs.filter((r) => r.validEvidence === true).length,
    updatedAt: now.toISOString(),
    evaluation: (payload.evaluation as UxWaveEvaluation | null | undefined) ?? null,
    runs,
    reportMarkdown: payload.reportMarkdown ?? null,
    reportUpdatedAt: payload.reportMarkdown ? now.toISOString() : null,
  }
  const db = getDb()
  await db.insert(uxWaves).values({
    id,
    studyId,
    waveKey: created.waveKey,
    status: created.status,
    runs: created.runs,
    evaluation: created.evaluation,
    reportMarkdown: created.reportMarkdown,
    reportUpdatedAt: created.reportUpdatedAt ? new Date(created.reportUpdatedAt) : null,
    updatedAt: now,
    createdAt: now,
  })
  await touchStudy(studyId, created.updatedAt!)
  return created
}

export async function dbPatchUxWave(
  studyId: string,
  waveId: string,
  payload: UxWaveWritePayload,
): Promise<UxWaveDetail | null> {
  const current = await dbUxWaveDetail(studyId, waveId)
  if (!current) return null
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
  return persistWave(next)
}

export async function dbStartUxWave(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  const current = await dbUxWaveDetail(studyId, waveId)
  if (!current) return null
  const runs = current.runs.map((r) => ({
    ...r,
    jobId: r.jobId ?? `job-fixture-${r.runKey}`,
    agentStatus: r.agentStatus === 'complete' ? r.agentStatus : 'running',
  }))
  return persistWave({
    ...current,
    status: 'running',
    runs,
    updatedAt: new Date().toISOString(),
  })
}

export async function dbSyncUxWave(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  const current = await dbUxWaveDetail(studyId, waveId)
  if (!current) return null
  let advanced = false
  const runs = current.runs.map((r) => {
    if (r.agentStatus === 'complete') return r
    if (r.agentStatus === 'running' || current.status === 'running') {
      advanced = true
      const ok = !r.runKey.startsWith('A-')
      return {
        ...r,
        agentStatus: 'complete',
        agentSuccess: ok,
        taskCompleted: ok,
        validEvidence: ok,
        validEvidenceCaveat: ok ? r.validEvidenceCaveat : 'fixture sync: invalid evidence',
        goalReached: ok,
        frictionScore: r.frictionScore ?? (ok ? 8 : 10),
        finding: r.finding ?? (ok ? 'Fixture sync completed run.' : 'Fixture sync: blocked.'),
      }
    }
    return r
  })
  const allDone = runs.every((r) => r.agentStatus === 'complete')
  const status = allDone ? 'complete' : current.status === 'draft' && !advanced ? 'draft' : 'running'
  return persistWave({
    ...current,
    status,
    runs,
    updatedAt: new Date().toISOString(),
  })
}

export async function dbPatchUxWaveRuns(
  studyId: string,
  waveId: string,
  runs: UxWaveRunItem[],
): Promise<UxWaveDetail | null> {
  const current = await dbUxWaveDetail(studyId, waveId)
  if (!current) return null
  const allDone = runs.every((r) => r.agentStatus === 'complete')
  const status = allDone ? 'complete' : 'running'
  return persistWave({
    ...current,
    status,
    runs,
    updatedAt: new Date().toISOString(),
  })
}

export async function dbMarkRunDerivedJourney(
  studyId: string,
  waveId: string,
  runKey: string,
  journeyId: string,
): Promise<UxWaveDetail | null> {
  const current = await dbUxWaveDetail(studyId, waveId)
  if (!current) return null
  const runs = current.runs.map((r) =>
    r.runKey === runKey ? { ...r, derivedJourneyId: journeyId } : r,
  )
  return persistWave({
    ...current,
    runs,
    updatedAt: new Date().toISOString(),
  })
}

export async function dbEvaluateUxWave(
  studyId: string,
  waveId: string,
): Promise<UxWaveDetail | null> {
  const current = await dbUxWaveDetail(studyId, waveId)
  if (!current) return null
  const { evaluateUxWaveFromRuns } = await import('../fixtures/ux-study-store')
  const { mergeSoftScoreDraft } = await import('../soft-q-draft')
  const { assistSoftScoresWithLlm } = await import('../soft-q-llm-assist')
  let evaluation = evaluateUxWaveFromRuns(
    studyId,
    waveId,
    current.runs,
    current.evaluation?.hypotheses ?? null,
    { existingSoftScores: current.evaluation?.softScores ?? null },
  )
  const assisted = await assistSoftScoresWithLlm(evaluation.softScores, current.runs)
  evaluation = {
    ...evaluation,
    softScores: assisted.softScores,
    notes: assisted.applied
      ? [...evaluation.notes.filter((n) => !/^Soft-Q LLM/i.test(n)), assisted.note]
      : evaluation.notes,
  }
  if (current.evaluation?.softScores) {
    evaluation.softScores = mergeSoftScoreDraft(
      evaluation.softScores,
      current.evaluation.softScores,
    )
  }
  const status = current.status === 'draft' ? 'complete' : current.status
  return persistWave({
    ...current,
    status,
    evaluation,
    updatedAt: new Date().toISOString(),
  })
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

/** Thin compare: load both waves and compute deltas (no extra persistence). */
export async function dbCompareUxWaves(
  studyId: string,
  waveId: string,
  otherWaveId: string,
): Promise<UxWaveCompareDelta | null> {
  const baseline = await dbUxWaveDetail(studyId, otherWaveId)
  const current = await dbUxWaveDetail(studyId, waveId)
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
    'usefulness',
    'ease',
    'clarity',
    'likelihood',
    'overall',
  ]
  const softScoreDelta: Record<string, UxCompareAggregateDelta> = {}
  for (const k of softKeys) {
    const b = softNum(baseline.evaluation, k)
    const c = softNum(current.evaluation, k)
    if (b == null && c == null) continue
    softScoreDelta[k] = deltaRow(b, c)
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
      scoreDelta: typeof bs === 'number' && typeof cs === 'number' ? cs - bs : null,
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
      frictionDelta: typeof bf === 'number' && typeof cf === 'number' ? cf - bf : null,
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
