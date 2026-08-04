import { afterEach, describe, expect, it } from 'vitest'
import { resetUxStudyStore } from '../lib/fixtures/ux-study-store'
import {
  flowToRfNodesEdges,
  rfToUxTestFlow,
} from '../lib/ux-flow-canvas'
import {
  compileUxTestFlowToPackShape,
  createStudyFromUxTestFlow,
  flattenFlowBlocks,
  getUxTestFlow,
  listUxTestFlows,
  resolveUxTestFlowForCreate,
  validateUxTestFlow,
} from '../lib/ux-test-flows'
import { paths } from '../lib/paths'

afterEach(() => {
  resetUxStudyStore()
})

describe('ux-test-flows', () => {
  it('lists all 10 catalog scenarios', () => {
    const items = listUxTestFlows()
    expect(items).toHaveLength(10)
    expect(items.map((i) => i.scenarioIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(items.filter((i) => i.compileReady)).toHaveLength(10)
  })

  it('validates feeling-gate and findability graphs', () => {
    const feeling = getUxTestFlow('flow-feeling-gate')!
    const find = getUxTestFlow('flow-findability')!
    expect(validateUxTestFlow(feeling)).toEqual({ ok: true })
    expect(validateUxTestFlow(find)).toEqual({ ok: true })
    expect(validateUxTestFlow(getUxTestFlow('flow-task-goal')!)).toEqual({ ok: true })
    expect(validateUxTestFlow(getUxTestFlow('flow-moderated-outline')!)).toEqual({ ok: true })
  })

  it('compiles findability flow with url_match successCriteria', () => {
    const flow = getUxTestFlow('flow-findability')!
    const pack = compileUxTestFlowToPackShape(flow)
    expect(pack.successCriteria).toEqual({ kind: 'url_match', pattern: 'example\\.com' })
    expect(pack.runs[0]?.urlKey).toBe(paths.labTemplateFindabilityStartUrlKey)
    expect(pack.runs[0]?.task).toMatch(/GATE \(url_match\)/i)
    expect(pack.domainProfileId).toBe('core')
    expect(pack.softScoreKeys).toContain('findability')
  })

  it('compiles feeling-gate with frustration abandon branch in task', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const pack = compileUxTestFlowToPackShape(flow)
    expect(pack.runs[0]?.task).toMatch(/frustration_high/i)
    expect(pack.runs[0]?.task).toMatch(/Brich ab|erkläre/i)
    expect(pack.runs[0]?.task).toMatch(/nächsten Schritt|Aufgabe/i)
  })

  it('flattens blocks with wenn/sonst depth', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const blocks = flattenFlowBlocks(flow)
    expect(blocks.some((b) => b.node.kind === 'gate')).toBe(true)
    expect(blocks.some((b) => b.branch === 'when')).toBe(true)
    expect(blocks.some((b) => b.branch === 'otherwise')).toBe(true)
  })

  it('creates study from compile-ready flow', async () => {
    const result = await createStudyFromUxTestFlow({
      flowId: 'flow-findability',
      waveKey: 'unit-from-flow',
    })
    expect(result).not.toBeNull()
    expect(result!.flowId).toBe('flow-findability')
    expect(result!.wave.runs).toHaveLength(1)
    expect(result!.wave.runs[0]?.url).toBe(paths.labTemplateFindabilityStartUrl)
    expect(result!.study.targetUrlKey).toBe(paths.labTemplateFindabilityStartUrlKey)
  })

  it('compiles segment-contrast into two parallel persona runs', () => {
    const flow = getUxTestFlow('flow-segment-contrast')!
    const pack = compileUxTestFlowToPackShape(flow)
    expect(pack.runs).toHaveLength(2)
    expect(pack.runs[0]?.personaId).toBe(paths.personaLabImpatientPersonaId)
    expect(pack.runs[1]?.personaId).toBe(paths.personaLabPatientPersonaId)
    expect(pack.runs[0]?.task).toBe(pack.runs[1]?.task)
  })

  it('validates all ten fixture graphs', () => {
    for (const item of listUxTestFlows()) {
      const flow = getUxTestFlow(item.id)!
      expect(validateUxTestFlow(flow), item.id).toEqual({ ok: true })
      expect(compileUxTestFlowToPackShape(flow).runs.length).toBeGreaterThan(0)
    }
  })

  it('round-trips feeling-gate through React Flow mapper', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const { nodes, edges } = flowToRfNodesEdges(flow)
    expect(nodes).toHaveLength(flow.nodes!.length)
    expect(edges).toHaveLength(flow.edges!.length)
    expect(nodes.every((n) => n.type === 'uxFlow')).toBe(true)
    const back = rfToUxTestFlow(flow, nodes, edges)
    expect(back.nodes?.map((n) => n.id).sort()).toEqual(flow.nodes!.map((n) => n.id).sort())
    expect(back.edges?.map((e) => `${e.from}>${e.to}:${e.kind}`).sort()).toEqual(
      flow.edges!.map((e) => `${e.from}>${e.to}:${e.kind}`).sort(),
    )
    expect(validateUxTestFlow(back)).toEqual({ ok: true })
  })

  it('creates study from inline edited flow snapshot', async () => {
    const base = getUxTestFlow('flow-feeling-gate')!
    const edited = {
      ...base,
      name: 'Edited feeling gate',
      nodes: base.nodes!.map((n) =>
        n.id === 'n-task' ? { ...n, text: 'Edited task: finde den CTA und nenne ihn.' } : n,
      ),
    }
    const resolved = resolveUxTestFlowForCreate({ flowId: base.id, flow: edited })
    expect(resolved?.compileReady).toBe(true)
    expect(resolved?.nodes?.find((n) => n.id === 'n-task')?.text).toMatch(/Edited task/)
    const result = await createStudyFromUxTestFlow({
      flowId: base.id,
      flow: edited,
      waveKey: 'unit-inline-flow',
      name: 'Inline study',
    })
    expect(result).not.toBeNull()
    expect(result!.study.name).toBe('Inline study')
    expect(result!.wave.runs[0]?.task).toMatch(/Edited task/)
  })
})
