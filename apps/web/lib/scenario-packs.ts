/**
 * ScenarioPack registry + materialize Study + Wave from pack.
 */

import type {
  SoftScoreKey,
  UxScenarioPack,
  UxScenarioPackSummary,
  UxStudyDetail,
  UxStudyFromPackPayload,
  UxStudyFromPackResult,
  UxWaveDetail,
  UxWaveRunItem,
  UxWaveWritePayload,
} from '@audion-v3/contracts'
import { paths } from './paths'
import { resolveLabPersonaId } from './lab-persona-resolve'
import { EBM_PRODUKTKOMBINATIONEN_PACK } from './fixtures/scenario-packs/ebm-produktkombinationen'
import { EBM_PERSONA_LAB_B_PACK } from './fixtures/scenario-packs/ebm-persona-lab-b'
import { EBM_PERSONA_LAB_NAV_PACK } from './fixtures/scenario-packs/ebm-persona-lab-nav'
import { EBM_PERSONA_LAB_PURCHASE_PACK } from './fixtures/scenario-packs/ebm-persona-lab-purchase'
import { EBM_PERSONA_LAB_AC_PACK } from './fixtures/scenario-packs/ebm-persona-lab-ac'
import { storeCreateUxStudy, storeCreateUxWave } from './fixtures/ux-study-store'

const PACKS: UxScenarioPack[] = [
  EBM_PRODUKTKOMBINATIONEN_PACK,
  EBM_PERSONA_LAB_B_PACK,
  EBM_PERSONA_LAB_NAV_PACK,
  EBM_PERSONA_LAB_PURCHASE_PACK,
  EBM_PERSONA_LAB_AC_PACK,
]

export function listScenarioPacks(): UxScenarioPackSummary[] {
  return PACKS.map((p) => ({
    id: p.id,
    name: p.name,
    sourceGuide: p.sourceGuide,
    targetUrlKey: p.targetUrlKey,
    runCount: p.runs.length,
  }))
}

export function getScenarioPack(packId: string): UxScenarioPack | null {
  return PACKS.find((p) => p.id === packId) ?? null
}

export function resolveScenarioPackUrl(urlKey: string): string {
  if (urlKey === 'bosch.ebike.home') return paths.boschEbikeHomeUrl
  if (urlKey === 'bosch.ebike.produktkombinationen') {
    return paths.boschEbikeProduktkombinationenUrl
  }
  // Fallback: treat as absolute URL only when it looks like one (still prefer keys)
  if (/^https?:\/\//i.test(urlKey)) return urlKey
  return paths.boschEbikeProduktkombinationenUrl
}

export function packRunsToWaveRuns(pack: UxScenarioPack): UxWaveRunItem[] {
  return pack.runs.map((r, index) => ({
    id: `run-${r.runKey}-${index}`,
    runKey: r.runKey,
    leitfadenBlock: r.leitfadenBlock,
    /** Lab fixture aliases → staging DB ids (env/paths); see lab-persona-resolve. */
    personaId: resolveLabPersonaId(r.personaId),
    personaName: r.personaName,
    segment: r.segment,
    url: resolveScenarioPackUrl(r.urlKey),
    task: r.task,
    maxSteps: r.maxSteps,
    jobId: null,
    agentStatus: null,
    agentSuccess: null,
    taskCompleted: null,
    validEvidence: null,
    validEvidenceCaveat: null,
    blockers: [],
    steps: null,
    frictionScore: null,
    personaFitScore: null,
    goalReached: null,
    finding: null,
    categories: {},
    finalUrl: null,
    finalTitle: null,
    deeplinkCheat: null,
  }))
}

export function emptySoftScoreShell(keys: SoftScoreKey[]) {
  const soft: Partial<Record<SoftScoreKey, { scale: string; value: null; confidence: number; rationale: string }>> =
    {}
  for (const key of keys) {
    soft[key] = {
      scale: key === 'Q7_gesamteindruck' ? '1-6_schulnote' : key === 'Q5_produktnah_vs_tool' ? 'choice' : '1-5',
      value: null,
      confidence: 0,
      rationale: '',
    }
  }
  return soft
}

/** Create a new study + draft wave seeded from a ScenarioPack. */
export async function createStudyFromScenarioPack(
  payload: UxStudyFromPackPayload,
): Promise<UxStudyFromPackResult | null> {
  const pack = getScenarioPack(payload.packId)
  if (!pack) return null

  const study = await storeCreateUxStudy({
    name: (payload.name ?? pack.name).trim(),
    status: 'draft',
    description: pack.description,
    projectId: payload.projectId !== undefined ? payload.projectId : pack.projectId,
    sourceGuide: pack.sourceGuide,
    targetUrlKey: pack.targetUrlKey,
    hypothesisTemplates: pack.hypothesisTemplates.map((h) => ({ ...h })),
  })

  const waveKey = (payload.waveKey ?? pack.defaultWaveKey).trim() || pack.defaultWaveKey
  const runs = packRunsToWaveRuns(pack)
  const wavePayload: UxWaveWritePayload = {
    waveKey,
    status: 'draft',
    runs,
    evaluation: {
      schemaVersion: '1.0.0',
      studyId: study.id,
      waveId: 'pending',
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
        segmentsMissingValidEvidence: [
          ...new Set(runs.map((r) => r.segment).filter(Boolean) as string[]),
        ],
      },
      hypotheses: pack.hypothesisTemplates.map((h) => ({
        id: h.id,
        statement: h.statement,
        verdict: 'not_tested' as const,
        confidence: 0,
        score: null,
        evidenceRunIds: [],
        rationale: '',
      })),
      softScores: {
        ...emptySoftScoreShell(pack.softScoreKeys),
        basis: 'Pending agent runs — Soft-Q filled after Evaluate on validEvidence.',
      },
      notes: [
        `Seeded from ScenarioPack ${pack.id}`,
        'Only runs with validEvidence=true should drive Soft-Q / hypotheses.',
      ],
    },
  }

  const wave = await storeCreateUxWave(study.id, wavePayload)
  if (!wave) return null

  if (wave.evaluation && wave.evaluation.waveId !== wave.id) {
    const { storePatchUxWave } = await import('./fixtures/ux-study-store')
    const patched = await storePatchUxWave(study.id, wave.id, {
      waveKey: wave.waveKey,
      evaluation: { ...wave.evaluation, waveId: wave.id, studyId: study.id },
    })
    return {
      study,
      wave: patched ?? { ...wave, evaluation: { ...wave.evaluation, waveId: wave.id } },
      packId: pack.id,
    }
  }

  return { study, wave, packId: pack.id }
}

/** Create a draft wave on an existing study from a ScenarioPack (EBM retest). */
export async function createWaveFromScenarioPack(
  studyId: string,
  packId: string,
  waveKey?: string,
): Promise<UxWaveDetail | null> {
  const pack = getScenarioPack(packId)
  if (!pack) return null
  const runs = packRunsToWaveRuns(pack)
  const key = (waveKey ?? `${pack.defaultWaveKey}-${Date.now().toString(36)}`).trim()
  const wave = await storeCreateUxWave(studyId, {
    waveKey: key,
    status: 'draft',
    runs,
    evaluation: {
      schemaVersion: '1.0.0',
      studyId,
      waveId: 'pending',
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
        segmentsMissingValidEvidence: [
          ...new Set(runs.map((r) => r.segment).filter(Boolean) as string[]),
        ],
      },
      hypotheses: pack.hypothesisTemplates.map((h) => ({
        id: h.id,
        statement: h.statement,
        verdict: 'not_tested' as const,
        confidence: 0,
        score: null,
        evidenceRunIds: [],
        rationale: '',
      })),
      softScores: {
        ...emptySoftScoreShell(pack.softScoreKeys),
        basis: 'Pending agent runs — Soft-Q filled after Evaluate on validEvidence.',
      },
      notes: [`Retest wave seeded from ScenarioPack ${pack.id}`],
    },
  })
  if (!wave?.evaluation) return wave
  const { storePatchUxWave } = await import('./fixtures/ux-study-store')
  return (
    (await storePatchUxWave(studyId, wave.id, {
      waveKey: wave.waveKey,
      evaluation: { ...wave.evaluation, waveId: wave.id, studyId },
    })) ?? wave
  )
}

export type { UxScenarioPack, UxStudyDetail, UxWaveDetail }
