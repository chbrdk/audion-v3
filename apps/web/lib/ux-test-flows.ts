/**
 * UX Test Flow registry: list, validate, compile → ScenarioPack shape, create study.
 * @see specs/domain/ux-test-flow-model.md
 */

import type {
  SoftScoreKey,
  UxFlowEdge,
  UxFlowNode,
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

function nodeMap(nodes: UxFlowNode[]): Map<string, UxFlowNode> {
  return new Map(nodes.map((n) => [n.id, n]))
}

function outs(edges: UxFlowEdge[], from: string, kind?: UxFlowEdge['kind']): UxFlowEdge[] {
  return edges.filter((e) => e.from === from && (kind ? e.kind === kind : true))
}

/** Ordered block list for UI: default path with gate branches annotated. */
export function flattenFlowBlocks(flow: UxTestFlow): Array<{
  node: UxFlowNode
  branch?: 'when' | 'otherwise' | 'main'
  depth: number
}> {
  const nodes = flow.nodes ?? []
  const edges = flow.edges ?? []
  if (!nodes.length) return []
  const byId = nodeMap(nodes)
  const start = nodes.find((n) => n.kind === 'start')
  if (!start) return []
  const out: Array<{ node: UxFlowNode; branch?: 'when' | 'otherwise' | 'main'; depth: number }> =
    []
  const visit = (id: string, depth: number, branch: 'when' | 'otherwise' | 'main', seen: Set<string>) => {
    if (seen.has(id)) return
    seen.add(id)
    const node = byId.get(id)
    if (!node) return
    out.push({ node, branch, depth })
    if (node.kind === 'gate') {
      const when = outs(edges, id, 'when')[0]
      const other = outs(edges, id, 'otherwise')[0]
      if (when) visit(when.to, depth + 1, 'when', new Set(seen))
      if (other) visit(other.to, depth + 1, 'otherwise', new Set(seen))
      return
    }
    const next = outs(edges, id, 'then')[0] ?? outs(edges, id).find((e) => e.kind === 'then')
    if (next) visit(next.to, depth, branch, seen)
  }
  visit(start.id, 0, 'main', new Set())
  return out
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
  ]

  const walkDefault = (id: string, seen: Set<string>) => {
    if (seen.has(id)) return
    seen.add(id)
    const n = byId.get(id)
    if (!n) return
    if (n.kind === 'start') {
      /* skip */
    } else if (n.kind === 'gate') {
      const whenEdge = outs(edges, id, 'when')[0]
      const otherEdge = outs(edges, id, 'otherwise')[0]
      const whenNode = whenEdge ? byId.get(whenEdge.to) : null
      const cond = n.gateCondition ?? 'condition'
      const whenTexts: string[] = []
      let cursor = whenNode
      const branchSeen = new Set<string>()
      while (cursor && !branchSeen.has(cursor.id)) {
        branchSeen.add(cursor.id)
        if (cursor.text) whenTexts.push(cursor.text)
        if (cursor.kind === 'abandon' || cursor.kind === 'success') break
        const t = outs(edges, cursor.id, 'then')[0]
        cursor = t ? byId.get(t.to) ?? null : null
      }
      parts.push(
        `GATE (${cond}): Wenn die Bedingung zutrifft → ${whenTexts.join(' ') || 'Zweig when'}. Sonst weiter auf dem Hauptpfad.`,
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
  const start = (flow.nodes ?? []).find((n) => n.kind === 'start')!
  const urlKey = start.urlKey?.trim() || paths.labTemplateFindabilityStartUrlKey
  const softKeys: SoftScoreKey[] =
    flow.softScoreKeys?.length ? flow.softScoreKeys : [...SOFT_SCORE_CORE_KEYS]
  const successCriteria = collectSuccessCriteria(flow)
  const task = compileTaskText(flow)

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
    fFragenPrompts: (flow.nodes ?? [])
      .filter((n) => n.kind === 'measure' && n.text)
      .map((n) => n.text!),
    defaultWaveKey: flow.defaultWaveKey,
    runs: [
      {
        runKey: `${flow.id}-run`,
        leitfadenBlock: flow.name,
        personaId: start.personaId || paths.personaLabImpatientPersonaId,
        personaName: start.personaName ?? 'Lab Persona',
        segment: start.segment ?? 'owner_upgrade',
        urlKey,
        task,
        maxSteps: start.maxSteps ?? 12,
        archetype: flow.primaryArchetype,
        successCriteria,
      },
    ],
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
  const runs = packRunsToWaveRuns(pack)
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
        'Compiled V1 — gates embedded in task text; live mid-run gates = Phase 2.',
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
