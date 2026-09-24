import { NextResponse } from 'next/server'
import {
  PLEXON_CONTRACT_VERSION_HEADER,
  PLEXON_FEDERATION_CONTRACT_VERSION,
  isProvisioningAuthorized,
} from '../../../../../../lib/plexon-contract'
import { getPlexonServiceSecret } from '../../../../../../lib/runtime-config'
import {
  storeGetByPlatformProjectId,
  storeUpsertByPlatformProjectId,
} from '../../../../../../lib/fixtures/project-store'
import { storePersonaList } from '../../../../../../lib/fixtures/persona-store'
import {
  storeTargetGroupForPersona,
  storeTargetGroupList,
} from '../../../../../../lib/fixtures/target-group-store'
import { storeJourneyList, storeJourneyDetail } from '../../../../../../lib/fixtures/journey-store'
import {
  storeUxStudyList,
  storeUxStudyDetail,
  storeUxWaveDetail,
} from '../../../../../../lib/fixtures/ux-study-store'

function jsonWithContract(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers)
  headers.set(PLEXON_CONTRACT_VERSION_HEADER, PLEXON_FEDERATION_CONTRACT_VERSION)
  return NextResponse.json(body, { ...init, headers })
}

/** Dashboard BFF: catalog summary for a mirrored platform project. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const secret = getPlexonServiceSecret()
  if (!isProvisioningAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const plexonUserId = request.headers.get('X-Plexon-User-Id')?.trim()
  if (!plexonUserId) {
    return NextResponse.json({ error: 'X-Plexon-User-Id required' }, { status: 400 })
  }
  const { id: platformProjectId } = await context.params
  if (!platformProjectId?.trim()) {
    return NextResponse.json({ error: 'platform project id required' }, { status: 400 })
  }
  const project = await storeGetByPlatformProjectId(platformProjectId.trim())
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const targetGroups = (await storeTargetGroupList()).items
    .filter((g) => g.projectId === project.id)
    .map((g) => ({
      id: g.id,
      name: g.name,
      segment: g.segment,
      personaCount: g.personaCount,
      status: g.status,
    }))

  const personas = (await storePersonaList()).items
    .filter((p) => p.projectId === project.id)
    .map(async (p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      status: p.status,
      targetGroupId: (await storeTargetGroupForPersona(p.id))?.id ?? null,
    }))

  const personaCatalog = await Promise.all(personas)

  const journeys = (await storeJourneyList()).items.filter((j) => j.projectId === project.id)

  const journeyCatalog = journeys.map((j) => ({
    id: j.id,
    name: j.name,
    status: j.status,
    journeyType: j.journeyType,
    phaseCount: j.phaseCount,
    targetGroupName: j.targetGroupName ?? null,
    updatedAt: j.updatedAt ?? null,
  }))

  const journeyPhases: Array<{
    journeyId: string
    journeyName: string
    phaseId: string
    phaseName: string
    phaseOrder: number
    elementCount: number
    summary: string
  }> = []
  const journeyElementRollup: Array<{
    journeyId: string
    journeyName: string
    kind: string
    count: number
  }> = []
  const journeyElements: Array<{
    journeyId: string
    journeyName: string
    phaseId: string
    phaseName: string
    phaseOrder: number
    elementId: string
    elementName: string
    kind: string
    order: number
  }> = []

  const JOURNEY_DETAIL_LIMIT = 12
  const JOURNEY_ELEMENTS_CAP = 200
  for (const j of journeys.slice(0, JOURNEY_DETAIL_LIMIT)) {
    const detail = await storeJourneyDetail(j.id)
    if (!detail) continue
    for (const phase of detail.phases ?? []) {
      if (journeyPhases.length < 80) {
        journeyPhases.push({
          journeyId: detail.id,
          journeyName: detail.name,
          phaseId: phase.id,
          phaseName: phase.name,
          phaseOrder: phase.order,
          elementCount: phase.elements?.length ?? 0,
          summary: phase.summary ?? '',
        })
      }
      const kindCounts = new Map<string, number>()
      for (const el of phase.elements ?? []) {
        kindCounts.set(el.kind, (kindCounts.get(el.kind) ?? 0) + 1)
        if (journeyElements.length < JOURNEY_ELEMENTS_CAP) {
          journeyElements.push({
            journeyId: detail.id,
            journeyName: detail.name,
            phaseId: phase.id,
            phaseName: phase.name,
            phaseOrder: phase.order,
            elementId: el.id,
            elementName: el.label,
            kind: el.kind,
            order: el.order,
          })
        }
      }
      for (const [kind, count] of kindCounts) {
        const existing = journeyElementRollup.find(
          (r) => r.journeyId === detail.id && r.kind === kind,
        )
        if (existing) existing.count += count
        else journeyElementRollup.push({ journeyId: detail.id, journeyName: detail.name, kind, count })
      }
    }
  }

  const studySummaries = (await storeUxStudyList()).items.filter(
    (s) => s.projectId === project.id,
  )
  const studies = studySummaries.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    waveCount: s.waveCount,
    targetUrlKey: s.targetUrlKey ?? null,
  }))

  const studyWaves: Array<{
    studyId: string
    studyName: string
    waveId: string
    waveName: string
    status: string
    createdAt: string | null
  }> = []
  const waveSoftScores: Array<{
    studyId: string
    studyName: string
    waveId: string
    waveName: string
    scoreKey: string
    value: number | string | null
    confidence?: number
    scale?: string
    basis?: string
  }> = []
  const waveDepth: Array<{
    studyId: string
    studyName: string
    waveId: string
    waveName: string
    status: string
    runCount: number
    validEvidenceCount: number
    taskCompletionRate?: number
    validEvidenceRate?: number
    infrastructureBlockRate?: number
    goalReachedRateValidOnly?: number | null
  }> = []
  const STUDY_DETAIL_LIMIT = 12
  const STUDY_WAVES_CAP = 80
  const WAVE_SOFT_SCORES_CAP = 200
  const WAVE_DEPTH_CAP = 80
  for (const s of studySummaries.slice(0, STUDY_DETAIL_LIMIT)) {
    const detail = await storeUxStudyDetail(s.id)
    if (!detail) continue
    for (const wave of detail.waves ?? []) {
      if (studyWaves.length < STUDY_WAVES_CAP) {
        studyWaves.push({
          studyId: detail.id,
          studyName: detail.name,
          waveId: wave.id,
          waveName: wave.waveKey,
          status: wave.status,
          createdAt: wave.updatedAt ?? null,
        })
      }

      const needDepth = waveDepth.length < WAVE_DEPTH_CAP
      const needSoft = waveSoftScores.length < WAVE_SOFT_SCORES_CAP
      if (needDepth || needSoft) {
        const waveDetail = await storeUxWaveDetail(detail.id, wave.id)
        const resolved = waveDetail ?? wave
        if (needDepth) {
          const agg = waveDetail?.evaluation?.aggregate
          const row: (typeof waveDepth)[number] = {
            studyId: detail.id,
            studyName: detail.name,
            waveId: resolved.id,
            waveName: resolved.waveKey,
            status: resolved.status,
            runCount: resolved.runCount,
            validEvidenceCount: resolved.validEvidenceCount,
          }
          if (agg) {
            row.taskCompletionRate = agg.taskCompletionRate
            row.validEvidenceRate = agg.validEvidenceRate
            row.infrastructureBlockRate = agg.infrastructureBlockRate
            row.goalReachedRateValidOnly = agg.goalReachedRateValidOnly
          }
          waveDepth.push(row)
        }
        if (needSoft) {
          const soft = waveDetail?.evaluation?.softScores
          if (soft) {
            const basis = typeof soft.basis === 'string' ? soft.basis : undefined
            for (const [scoreKey, entry] of Object.entries(soft)) {
              if (scoreKey === 'basis') continue
              if (!entry || typeof entry !== 'object') continue
              if (waveSoftScores.length >= WAVE_SOFT_SCORES_CAP) break
              const block = entry as {
                value?: number | string | null
                confidence?: number
                scale?: string
              }
              const row: (typeof waveSoftScores)[number] = {
                studyId: detail.id,
                studyName: detail.name,
                waveId: resolved.id,
                waveName: resolved.waveKey,
                scoreKey,
                value: block.value ?? null,
              }
              if (typeof block.confidence === 'number') row.confidence = block.confidence
              if (typeof block.scale === 'string') row.scale = block.scale
              if (basis) row.basis = basis
              waveSoftScores.push(row)
            }
          }
        }
      }

      if (
        studyWaves.length >= STUDY_WAVES_CAP &&
        waveDepth.length >= WAVE_DEPTH_CAP &&
        waveSoftScores.length >= WAVE_SOFT_SCORES_CAP
      ) {
        break
      }
    }
    if (
      studyWaves.length >= STUDY_WAVES_CAP &&
      waveDepth.length >= WAVE_DEPTH_CAP &&
      waveSoftScores.length >= WAVE_SOFT_SCORES_CAP
    ) {
      break
    }
  }

  return jsonWithContract({
    externalProjectId: project.id,
    personaCount: personaCatalog.length,
    targetGroupCount: targetGroups.length,
    journeyCount: journeyCatalog.length,
    studyCount: studies.length,
    targetGroups,
    personas: personaCatalog,
    journeys: journeyCatalog,
    studies,
    journeyPhases,
    journeyElementRollup,
    journeyElements,
    studyWaves,
    waveSoftScores,
    waveDepth,
    platformProjectId: platformProjectId.trim(),
  })
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const secret = getPlexonServiceSecret()
  if (!isProvisioningAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id: platformProjectId } = await context.params
  if (!platformProjectId?.trim()) {
    return NextResponse.json({ error: 'platform project id required' }, { status: 400 })
  }
  let body: {
    platformCompanyId?: string
    name?: string
    status?: 'active' | 'archived'
    ownerUserId?: string
    contractVersion?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (body.contractVersion !== PLEXON_FEDERATION_CONTRACT_VERSION) {
    return NextResponse.json({ error: 'Unsupported contract version' }, { status: 400 })
  }
  if (!body.name?.trim() || !body.platformCompanyId?.trim() || !body.ownerUserId?.trim()) {
    return NextResponse.json({ error: 'name, platformCompanyId, ownerUserId required' }, { status: 400 })
  }
  const project = await storeUpsertByPlatformProjectId(platformProjectId.trim(), {
    name: body.name.trim(),
    platformCompanyId: body.platformCompanyId.trim(),
    ownerUserId: body.ownerUserId.trim(),
    status: body.status === 'archived' ? 'archived' : 'active',
  })
  return jsonWithContract({
    status: 'applied',
    /** Federation contract field consumed by PLEXON binding sync. */
    externalProjectId: project.id,
    projectId: project.id,
    platformProjectId: platformProjectId.trim(),
  })
}
