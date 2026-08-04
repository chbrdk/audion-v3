import { afterEach, describe, expect, it } from 'vitest'
import { resetUxStudyStore } from '../lib/fixtures/ux-study-store'
import {
  compileUxTestFlowToPackShape,
  createStudyFromUxTestFlow,
  flattenFlowBlocks,
  getUxTestFlow,
  listUxTestFlows,
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
    expect(items.filter((i) => i.compileReady)).toHaveLength(3)
  })

  it('validates feeling-gate and findability graphs', () => {
    const feeling = getUxTestFlow('flow-feeling-gate')!
    const find = getUxTestFlow('flow-findability')!
    expect(validateUxTestFlow(feeling)).toEqual({ ok: true })
    expect(validateUxTestFlow(find)).toEqual({ ok: true })
    const catalog = getUxTestFlow('flow-task-goal')!
    expect(validateUxTestFlow(catalog).ok).toBe(false)
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
})
