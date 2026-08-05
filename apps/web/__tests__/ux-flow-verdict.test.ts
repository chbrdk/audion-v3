import { describe, expect, it } from 'vitest'
import { getUxTestFlow } from '../lib/ux-test-flows'
import { deriveFlowVerdict } from '../lib/ux-flow-verdict'

describe('ux-flow-verdict', () => {
  it('returns running before first step', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const verdict = deriveFlowVerdict(flow, { status: 'running', steps: [] })
    expect(verdict.status).toBe('running')
    expect(verdict.taskCompleted).toBe(false)
    expect(verdict.validEvidence).toBe(false)
  })

  it('marks task completed on success terminal with substance', () => {
    const flow = getUxTestFlow('flow-findability')!
    const verdict = deriveFlowVerdict(flow, {
      status: 'complete',
      success: true,
      gateSignals: {
        finalUrl: 'https://example.com/',
        finalTitle: 'Example',
        frustrationHigh: false,
        confusionNamed: false,
        goalReached: true,
      },
      steps: [
        {
          action: 'navigate',
          target: 'https://example.com/',
          result: 'Landed on example.com with clear navigation and completed the findability task.',
          reasoning: 'The goal page is visible and I can proceed without confusion.',
        },
        {
          action: 'done',
          result: 'Task completed successfully on the target URL with no blockers.',
        },
      ],
      scorecard: { coverage: { goalReached: true }, frictionScore: 6 },
    })
    expect(verdict.terminalKind).toBe('success')
    expect(verdict.flowCompleted).toBe(true)
    expect(verdict.taskCompleted).toBe(true)
    expect(verdict.goalReached).toBe(true)
    expect(verdict.validEvidence).toBe(true)
    expect(verdict.gatesOnPath.some((g) => g.condition === 'url_match')).toBe(true)
  })

  it('reports running with goal reached signal', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const verdict = deriveFlowVerdict(flow, {
      status: 'running',
      gateSignals: { goalReached: true, frustrationHigh: false, confusionNamed: false },
      steps: [{ action: 'click', reasoning: 'still exploring the interface' }],
    })
    expect(verdict.status).toBe('running')
    expect(verdict.goalReached).toBe(true)
    expect(verdict.validEvidence).toBe(false)
    expect(verdict.summary).toMatch(/Läuft/)
  })

  it('rejects junk evidence on cancelled run', () => {
    const flow = getUxTestFlow('flow-feeling-gate')!
    const verdict = deriveFlowVerdict(flow, {
      status: 'complete',
      success: false,
      cancelled: true,
      steps: [],
    })
    expect(verdict.validEvidence).toBe(false)
    expect(verdict.validEvidenceCaveat).toMatch(/cancelled/i)
  })
})
