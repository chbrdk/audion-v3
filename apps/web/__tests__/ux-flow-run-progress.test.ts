import { describe, expect, it } from 'vitest'
import { getUxTestFlow } from '../lib/ux-test-flows'
import {
  extractLastHttpUrl,
  mapJobToFlowNodeStates,
} from '../lib/ux-flow-run-progress'
import { defaultExecutionPath } from '../lib/ux-test-flow-graph'

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
