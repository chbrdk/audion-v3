import { describe, expect, it, beforeEach } from 'vitest'
import { getUxTestFlow } from '../lib/ux-test-flows'
import {
  deriveGateSignalsFromJob,
  evaluateFlowGates,
  extractLastHttpUrl,
  mapJobToFlowNodeStates,
} from '../lib/ux-flow-run-progress'
import { defaultExecutionPath } from '../lib/ux-test-flow-graph'
import {
  getSavedUxFlowByTemplate,
  listSavedUxFlows,
  resetUxFlowStore,
  saveUxFlow,
} from '../lib/fixtures/ux-flow-store'

describe('ux-flow-run-progress', () => {
  it('extracts last http target from steps', () => {
    expect(
      extractLastHttpUrl(
        [{ target: 'button' }, { target: 'https://example.com/x' }, { target: '#ok' }],
        null,
      ),
    ).toBe('https://example.com/x')
    expect(extractLastHttpUrl([], 'https://final.test')).toBe('https://final.test')
  })

  it('marks start active with zero steps while running', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const states = mapJobToFlowNodeStates(flow, { status: 'running', steps: [] })
    expect(states['n-start']).toBe('active')
    expect(states['n-look']).toBe('idle')
  })

  it('advances cursor along default path as steps accumulate', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const path = defaultExecutionPath(flow)
    expect(path[0]?.kind).toBe('start')
    const states = mapJobToFlowNodeStates(flow, {
      status: 'running',
      steps: [{ action: 'click' }, { action: 'click' }, { action: 'type' }],
    })
    const activeId = Object.entries(states).find(([, s]) => s === 'active')?.[0]
    expect(activeId).toBeTruthy()
    expect(states['n-start']).toBe('done')
  })

  it('switches to when-branch when url_match pattern hits', () => {
    const flow = getUxTestFlow('flow-findability')!
    const states = mapJobToFlowNodeStates(flow, {
      status: 'running',
      steps: [
        { action: 'navigate', target: 'https://example.org/' },
        { action: 'navigate', target: 'https://example.com/' },
      ],
      finalUrl: 'https://example.com/',
    })
    expect(states['n-gate']).toBe('done')
    expect(states['n-ok']).toBe('active')
    expect(states['n-fail']).toBe('idle')
  })

  it('prefers gateSignals over raw finalUrl for url_match', () => {
    const flow = getUxTestFlow('flow-findability')!
    const states = mapJobToFlowNodeStates(flow, {
      status: 'running',
      steps: [{ action: 'navigate', target: 'https://example.org/' }],
      finalUrl: 'https://example.org/',
      gateSignals: {
        finalUrl: 'https://example.com/',
        finalTitle: null,
        frustrationHigh: false,
        confusionNamed: false,
      },
    })
    expect(states['n-gate']).toBe('done')
    expect(states['n-ok']).toBe('active')
  })

  it('takes when-branch on frustration_high gateSignals', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const { gateMatched, matchedGateId } = evaluateFlowGates(flow, {
      frustrationHigh: true,
      confusionNamed: false,
    })
    expect(gateMatched).toBe(true)
    expect(matchedGateId).toBeTruthy()
    const states = mapJobToFlowNodeStates(flow, {
      status: 'running',
      steps: [
        { action: 'click' },
        { action: 'click' },
        {
          action: 'click',
          perception: { stance: 'abandon', clarity: 0, confusion: 'stuck' },
        },
      ],
      gateSignals: { frustrationHigh: true, confusionNamed: true },
      flowCursor: {
        activeEdgeKind: 'when',
        gateEvaluations: [{ condition: 'frustration_high', matched: true }],
      },
    })
    expect(states['n-start']).toBe('done')
    const activeId = Object.entries(states).find(([, s]) => s === 'active')?.[0]
    expect(activeId).toBeTruthy()
  })

  it('derives gateSignals from perception steps', () => {
    const signals = deriveGateSignalsFromJob({
      status: 'running',
      steps: [
        {
          target: 'https://example.org/',
          perception: { stance: 'abandon', confusion: 'x', clarity: 0 },
        },
      ],
    })
    expect(signals.frustrationHigh).toBe(true)
    expect(signals.confusionNamed).toBe(true)
    expect(signals.finalUrl).toBe('https://example.org/')
  })

  it('marks success done on complete success', () => {
    const flow = getUxTestFlow('flow-findability')!
    const states = mapJobToFlowNodeStates(flow, {
      status: 'complete',
      success: true,
      steps: [{ target: 'https://example.com/' }],
      finalUrl: 'https://example.com/',
    })
    expect(states['n-ok']).toBe('done')
    expect(states['n-fail']).toBe('skipped')
  })

  it('marks abandon on complete failure', () => {
    const flow = getUxTestFlow('flow-findability')!
    const states = mapJobToFlowNodeStates(flow, {
      status: 'complete',
      success: false,
      steps: [{ target: 'https://example.org/' }],
      finalUrl: 'https://example.org/',
    })
    expect(states['n-fail']).toBe('done')
    expect(states['n-ok']).toBe('skipped')
  })
})

describe('ux-flow-store', () => {
  beforeEach(() => {
    resetUxFlowStore()
  })

  it('saves and loads by templateFlowId', () => {
    const flow = getUxTestFlow('flow-findability')!
    const saved = saveUxFlow({
      templateFlowId: flow.id,
      name: 'My edit',
      flow: { ...flow, name: 'My edit' },
    })
    expect(saved.id).toBeTruthy()
    expect(listSavedUxFlows(flow.id)).toHaveLength(1)
    const again = getSavedUxFlowByTemplate(flow.id)
    expect(again?.name).toBe('My edit')
    const upsert = saveUxFlow({
      templateFlowId: flow.id,
      name: 'My edit 2',
      flow: { ...flow, name: 'My edit 2' },
    })
    expect(upsert.id).toBe(saved.id)
    expect(listSavedUxFlows(flow.id)).toHaveLength(1)
    expect(getSavedUxFlowByTemplate(flow.id)?.name).toBe('My edit 2')
  })
})
