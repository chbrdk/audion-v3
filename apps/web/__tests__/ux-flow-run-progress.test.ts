import { describe, expect, it, beforeEach } from 'vitest'
import { getUxTestFlow } from '../lib/ux-test-flows'
import {
  deriveGateSignalsFromJob,
  evaluateFlowGates,
  extractLastHttpUrl,
  mapJobToFlowNodeOutputs,
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

  it('takes when-branch on consent_accepted gateSignals', () => {
    const flow = getUxTestFlow('flow-consent-gate')!
    const { gateMatched, matchedGateId } = evaluateFlowGates(flow, {
      consentAccepted: true,
      consentRejected: false,
    })
    expect(gateMatched).toBe(true)
    expect(matchedGateId).toBe('n-gate')
    const states = mapJobToFlowNodeStates(flow, {
      status: 'running',
      steps: [
        { action: 'click', target: 'Externen Inhalt bestätigen', result: 'ok' },
        { action: 'click' },
        { action: 'click' },
      ],
      gateSignals: { consentAccepted: true },
    })
    expect(states['n-gate']).toBe('done')
    expect(states['n-accept']).toBe('active')
    expect(states['n-reject']).toBe('idle')
  })

  it('takes when-branch on goal_reached', () => {
    const flow = getUxTestFlow('flow-task-goal')!
    const { gateMatched } = evaluateFlowGates(flow, { goalReached: true })
    expect(gateMatched).toBe(true)
  })

  it('matches time_elapsed against preceding observeSeconds', () => {
    const flow = getUxTestFlow('flow-consent-gate')!
    // Graft a time_elapsed gate for the unit test without mutating catalog.
    const timed = {
      ...flow,
      nodes: flow.nodes.map((n) =>
        n.id === 'n-gate' ? { ...n, gateCondition: 'time_elapsed' as const } : n,
      ),
    }
    const miss = evaluateFlowGates(timed, { elapsedSeconds: 10 })
    expect(miss.gateMatched).toBe(false)
    const hit = evaluateFlowGates(timed, { elapsedSeconds: 45 })
    expect(hit.gateMatched).toBe(true)
  })

  it('derives consent and goal from step text / success', () => {
    const consent = deriveGateSignalsFromJob({
      status: 'running',
      steps: [{ action: 'click', target: 'Bestätigen', result: 'akzeptiert' }],
    })
    expect(consent.consentAccepted).toBe(true)
    const goal = deriveGateSignalsFromJob({
      status: 'complete',
      success: true,
      steps: [],
      scorecard: { coverage: { goalReached: true } },
    })
    expect(goal.goalReached).toBe(true)
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

  it('maps step text and screenshot into node outputs', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const outputs = mapJobToFlowNodeOutputs(flow, {
      status: 'running',
      jobId: 'job-abc',
      steps: [
        {
          step: 1,
          action: 'click',
          target: 'Nav',
          result: 'opened menu',
          screenshotUrl: '/run/job-abc/step/1/screenshot',
        },
        {
          step: 2,
          action: 'type',
          target: 'search',
          reasoning: 'looking for CTA',
          thinkAloud: { now: 'Ich scanne die Seite' },
        },
      ],
    })
    const values = Object.values(outputs)
    expect(values.length).toBeGreaterThan(0)
    const withImg = values.find((o) => o.imageUrl)
    expect(withImg?.imageUrl).toBe('/api/ux-journey-agent/run/job-abc/step/1/screenshot')
    const activeOut = Object.entries(mapJobToFlowNodeStates(flow, {
      status: 'running',
      steps: [
        { step: 1, action: 'click', target: 'Nav' },
        { step: 2, action: 'type', target: 'search', thinkAloud: { now: 'Ich scanne die Seite' } },
      ],
    }))
      .filter(([, s]) => s === 'active')
      .map(([id]) => outputs[id])
    expect(activeOut[0]?.text).toMatch(/Ich scanne|looking for CTA|type/i)
  })

  it('synthesizes screenshot URL from jobId + step when missing', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const outputs = mapJobToFlowNodeOutputs(flow, {
      status: 'running',
      jobId: 'job-xyz',
      steps: [{ step: 3, action: 'scroll', result: 'scrolled' }],
    })
    const any = Object.values(outputs)[0]
    expect(any?.imageUrl).toBe('/api/ux-journey-agent/run/job-xyz/step/3/screenshot')
    expect(any?.label).toMatch(/scroll/i)
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
