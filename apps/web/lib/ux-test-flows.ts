/**
 * UX Test Flow registry: list, validate, compile → ScenarioPack shape, create study.
 * @see specs/domain/ux-test-flow-model.md
 */

import type {
  SoftScoreKey,
  UxScenarioPack,
  UxStudyFromFlowPayload,
  UxStudyFromFlowResult,
  UxSuccessCriteria,
  UxTestFlow,
  UxTestFlowSummary,
} from '@audion-v3/contracts'
import { SOFT_SCORE_CORE_KEYS } from '@audion-v3/contracts'
import { UX_TEST_FLOWS } from './fixtures/ux-test-flows/catalog'
import {
  emptySoftScoreShell,
  packRunsToWaveRuns,
  resolveScenarioPackUrl,
} from './scenario-packs'
import { storeCreateUxStudy, storeCreateUxWave } from './fixtures/ux-study-store'
import { paths } from './paths'
import { flattenFlowBlocks, nodeMap, outs } from './ux-test-flow-graph'
import { toFlowGraphSnapshot } from './ux-flow-replan'

export { flattenFlowBlocks } from './ux-test-flow-graph'

export function listUxTestFlows(): UxTestFlowSummary[] {
  return UX_TEST_FLOWS.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
    scenarioIndex: f.scenarioIndex,
    primaryArchetype: f.primaryArchetype,
    nodeKindsUsed: f.nodeKindsUsed,
    compileReady: f.compileReady,
  })).sort((a, b) => a.scenarioIndex - b.scenarioIndex)
}

export function getUxTestFlow(flowId: string): UxTestFlow | null {
  return UX_TEST_FLOWS.find((f) => f.id === flowId) ?? null
}

export type UxFlowValidation = { ok: true } | { ok: false; errors: string[] }

export function validateUxTestFlow(flow: UxTestFlow): UxFlowValidation {
  const errors: string[] = []
  if (!flow.compileReady) {
    return { ok: false, errors: [`Flow "${flow.id}" is catalog-only (compileReady=false).`] }
  }
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  if (!nodes.length) errors.push('Flow has no nodes.')
  if (!edges.length) errors.push('Flow has no edges.')
  const starts = nodes.filter((n) => n.kind === 'start')
  if (starts.length !== 1) errors.push('Flow must have exactly one start node.')
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) {
      errors.push(`Edge ${e.id} references missing node.`)
    }
  }
  for (const n of nodes) {
    if (n.kind !== 'gate') continue
    const when = edges.filter((e) => e.from === n.id && e.kind === 'when')
    const other = edges.filter((e) => e.from === n.id && e.kind === 'otherwise')
    if (when.length !== 1 || other.length !== 1) {
      errors.push(`Gate ${n.id} needs exactly one when and one otherwise edge.`)
    }
    if (!n.gateCondition) errors.push(`Gate ${n.id} missing gateCondition.`)
  }
  return errors.length ? { ok: false, errors } : { ok: true }
}

function collectSuccessCriteria(flow: UxTestFlow): UxSuccessCriteria | null {
  if (flow.successCriteria) return flow.successCriteria
  for (const n of flow.nodes ?? []) {
    if (n.kind === 'gate' && (n.gateCondition === 'url_match' || n.gateCondition === 'title_match')) {
      return {
        kind: n.gateCondition === 'url_match' ? 'url_match' : 'title_match',
        pattern: n.pattern ?? null,
      }
    }
  }
  return null
}

function compileTaskText(flow: UxTestFlow): string {
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  const byId = nodeMap(nodes)
  const start = nodes.find((n) => n.kind === 'start')
  if (!start) return ''

  const parts: string[] = [
    `UX Test Flow „${flow.name}“ (${flow.id}). Folge den Schritten ehrlich; denke laut.`,
    'Live-Gates werden zur Laufzeit bewertet; bei Match folgt ein Replan-Segment (nicht vorwegnehmen).',
  ]

  const walkDefault = (id: string, seen: Set<string>) => {
    if (seen.has(id)) return
    seen.add(id)
    const n = byId.get(id)
    if (!n) return
    if (n.kind === 'start') {
      /* skip */
    } else if (n.kind === 'gate') {
      const otherEdge = outs(edges, id, 'otherwise')[0]
      const cond = n.gateCondition ?? 'condition'
      parts.push(
        `GATE (${cond}): Runtime bewertet. Bei Match → Replan-Segment auf dem when-Zweig. Sonst weiter auf dem Hauptpfad.`,
      )
      if (otherEdge) walkDefault(otherEdge.to, seen)
      return
    } else if (n.text) {
      const prefix =
        n.kind === 'observe' && n.observeSeconds
          ? `Beobachten (~${n.observeSeconds}s): `
          : n.kind === 'message'
            ? 'Hinweis: '
            : n.kind === 'measure'
              ? 'Messung: '
              : n.kind === 'abandon'
                ? 'Abbruch-Pfad: '
                : n.kind === 'success'
                  ? 'Erfolg: '
                  : ''
      parts.push(`${prefix}${n.text}`)
    }
    const next = outs(edges, id, 'then')[0]
    if (next) walkDefault(next.to, seen)
  }

  walkDefault(start.id, new Set())
  return parts.filter(Boolean).join(' ')
}

/**
 * Compile a compile-ready flow into a transient ScenarioPack shape.
 */
export function compileUxTestFlowToPackShape(flow: UxTestFlow): UxScenarioPack {
  const validation = validateUxTestFlow(flow)
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '))
  }
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  const byId = nodeMap(nodes)
  const start = nodes.find((n) => n.kind === 'start')!
  const urlKey = start.urlKey?.trim() || paths.labTemplateFindabilityStartUrlKey
  const softKeys: SoftScoreKey[] =
    flow.softScoreKeys?.length ? flow.softScoreKeys : [...SOFT_SCORE_CORE_KEYS]
  const successCriteria = collectSuccessCriteria(flow)
  const task = compileTaskText(flow)

  const baseRun = {
    leitfadenBlock: flow.name,
    urlKey,
    task,
    maxSteps: start.maxSteps ?? 12,
    archetype: flow.primaryArchetype,
    successCriteria,
  }

  const runs = [
    {
      ...baseRun,
      runKey: `${flow.id}-run-a`,
      personaId: start.personaId || paths.personaLabImpatientPersonaId,
      personaName: start.personaName ?? 'Lab Persona',
      segment: start.segment ?? 'owner_upgrade',
    },
    ...outs(edges, start.id, 'parallel').map((edge, i) => {
      const marker = byId.get(edge.to)
      return {
        ...baseRun,
        runKey: `${flow.id}-run-b${i || ''}`,
        personaId:
          marker?.personaId ||
          paths.personaLabPatientPersonaId,
        personaName: marker?.personaName ?? 'Lab Persona B',
        segment: marker?.segment ?? start.segment ?? 'owner_upgrade',
        maxSteps: marker?.maxSteps ?? start.maxSteps ?? 12,
      }
    }),
  ]

  return {
    id: `compiled-${flow.id}`,
    name: flow.name,
    description: flow.description,
    sourceGuide: `UX Test Flow ${flow.id} · ${paths.uxTestFlowModelSpecPath}`,
    targetUrlKey: urlKey,
    projectId: 'proj-audion-core',
    hypothesisTemplates: [
      {
        id: 'F1',
        statement: `Flow ${flow.name}: primary archetype ${flow.primaryArchetype}`,
      },
    ],
    softScoreKeys: softKeys,
    domainProfileId: flow.domainProfileId ?? 'core',
    archetype: flow.primaryArchetype,
    successCriteria,
    fFragenPrompts: nodes
      .filter((n) => n.kind === 'measure' && n.text)
      .map((n) => n.text!),
    defaultWaveKey: flow.defaultWaveKey,
    runs,
  }
}

/**
 * Inline snapshot wins over fixture; requires full graph when `flow` is set.
 */
export function resolveUxTestFlowForCreate(
  payload: UxStudyFromFlowPayload,
): UxTestFlow | null {
  if (payload.flow) {
    const flow = payload.flow
    const base =
      (payload.flowId ? getUxTestFlow(payload.flowId) : null) ??
      (flow.id ? getUxTestFlow(flow.id) : null)
    const id = (flow.id?.trim() || payload.flowId?.trim() || base?.id || '').trim()
    if (!id) return null
    const merged: UxTestFlow = {
      ...(base ?? {
        id,
        name: flow.name || id,
        description: flow.description || '',
        scenarioIndex: flow.scenarioIndex ?? 0,
        primaryArchetype: flow.primaryArchetype ?? 'task_goal',
        nodeKindsUsed: flow.nodeKindsUsed ?? [],
        defaultWaveKey: flow.defaultWaveKey || id,
        compileReady: false,
      }),
      ...flow,
      id,
      nodes: flow.nodes ?? null,
      edges: flow.edges ?? null,
    }
    const hasGraph = Boolean(merged.nodes?.length && merged.edges?.length)
    return { ...merged, compileReady: hasGraph }
  }
  if (payload.flowId?.trim()) return getUxTestFlow(payload.flowId.trim())
  return null
}

export async function createStudyFromUxTestFlow(
  payload: UxStudyFromFlowPayload,
): Promise<UxStudyFromFlowResult | null> {
  const flow = resolveUxTestFlowForCreate(payload)
  if (!flow) return null
  const validation = validateUxTestFlow(flow)
  if (!validation.ok) {
    throw new Error(validation.errors.join(' '))
  }
  const pack = compileUxTestFlowToPackShape(flow)

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
  const graph = toFlowGraphSnapshot(flow)
  const runs = packRunsToWaveRuns(pack).map((r) =>
    graph ? { ...r, flowGraph: graph } : r,
  )
  // Ensure URL resolves (absolute keys ok)
  resolveScenarioPackUrl(pack.targetUrlKey)

  const wavePayload = {
    waveKey,
    status: 'draft' as const,
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
        `Seeded from UX Test Flow ${flow.id}`,
        'Compiled V1 + Phase 3 mid-run Live-Gate replan when flowGraph is present.',
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
      flowId: flow.id,
    }
  }

  return { study, wave, flowId: flow.id }
}
