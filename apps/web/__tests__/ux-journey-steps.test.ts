import { describe, expect, it } from 'vitest'
import {
  bffVideoUrlForJob,
  chatUxJourneyStepLabel,
  chatUxJourneyStepShotSrc,
  composeMessageWithUxStepContext,
  formatScorecardSummary,
  parseUxStepFollowUpDisplay,
  rewriteAgentMediaUrl,
  synthesizeThinkAloudFallback,
  toChatUxJourneySteps,
} from '../lib/chat/ux-journey-steps'

describe('ux journey step media helpers', () => {
  it('rewrites agent /run paths onto the BFF', () => {
    expect(rewriteAgentMediaUrl('/run/abc/step/2/screenshot')).toBe(
      '/api/ux-journey-agent/run/abc/step/2/screenshot',
    )
    expect(rewriteAgentMediaUrl('/api/ux-journey-agent/run/abc/video')).toBe(
      '/api/ux-journey-agent/run/abc/video',
    )
    expect(rewriteAgentMediaUrl('data:image/png;base64,xx')).toBe('data:image/png;base64,xx')
  })

  it('maps agent steps for chat cards with thinkAloud fallback', () => {
    const steps = toChatUxJourneySteps([
      {
        step: 1,
        action: 'navigate',
        target: 'https://msqdx.com',
        reasoning: 'Opening the homepage',
        reasoningMeta: {
          evaluation_previous_goal: 'Landed on homepage as expected.',
          memory: 'Hero CTA label: Start free',
          next_goal: 'Click the Start free button [12]',
        },
        screenshotUrl: '/run/job-1/step/1/screenshot',
      },
    ])
    expect(steps[0]?.screenshotUrl).toBe('/api/ux-journey-agent/run/job-1/step/1/screenshot')
    expect(chatUxJourneyStepShotSrc(steps[0]!)).toContain('/api/ux-journey-agent/')
    expect(steps[0]?.reasoningMeta?.memory).toBe('Hero CTA label: Start free')
    expect(steps[0]?.thinkAloud?.think).toBe('Opening the homepage')
    expect(steps[0]?.thinkAloud?.learned).toBe('Hero CTA label: Start free')
    expect(steps[0]?.thinkAloud?.next).toContain('Start free')
    expect(bffVideoUrlForJob('job-1', '/run/job-1/video')).toBe(
      '/api/ux-journey-agent/run/job-1/video',
    )
  })

  it('keeps product thinkAloud channels when the agent emits them', () => {
    const steps = toChatUxJourneySteps([
      {
        step: 2,
        action: 'click',
        reasoning: 'VO line',
        thinkAloud: {
          seen: 'Primary CTA above the fold',
          think: 'This looks like the trial path',
          priorKnow: 'We usually hide pricing behind signup',
          learned: 'CTA says Start free',
          next: 'Open the pricing page',
          why: 'Need a clear price signal',
          feel: { label: 'cautious', valence: -1 },
        },
        observations: [
          {
            category: 'copy',
            polarity: -1,
            severity: 'low',
            note: 'Vague CTA label',
          },
        ],
      },
    ])
    expect(steps[0]?.thinkAloud?.seen).toBe('Primary CTA above the fold')
    expect(steps[0]?.thinkAloud?.feel?.valence).toBe(-1)
    expect(steps[0]?.observations?.[0]?.category).toBe('copy')
  })

  it('composes follow-up chat with selected step context', () => {
    const composed = composeMessageWithUxStepContext(
      'Was the CTA clear?',
      {
        step: 2,
        action: 'click',
        target: 'Start free',
        reasoning: 'I want to try the product.',
        reasoningMeta: { memory: 'CTA above fold', next_goal: 'Open pricing' },
      },
      1,
    )
    expect(composed.display).toContain('About Step 02 · Click')
    expect(composed.display).toContain('Was the CTA clear?')
    expect(composed.api).toContain('User question: Was the CTA clear?')
    expect(composed.api).toContain('Denken: I want to try the product.')
    expect(composed.api).toContain('Neu gelernt: CTA above fold')
    expect(composed.api).toContain('Nächster Schritt: Open pricing')
    expect(chatUxJourneyStepLabel({ step: 2, action: 'click' })).toBe('Step 02 · Click')
    const parsed = parseUxStepFollowUpDisplay(composed.display)
    expect(parsed.meta).toBe('Step 02 · Click')
    expect(parsed.body).toBe('Was the CTA clear?')
  })

  it('formats scorecard summary for the inspect dock', () => {
    expect(
      formatScorecardSummary({
        frictionScore: 4,
        personaFitScore: 8,
        topStrengths: ['Clear nav'],
        topWeaknesses: ['Dense hero'],
      }),
    ).toBe('Friction 4/10 · Persona fit 8/10 · + Clear nav · − Dense hero')
    expect(formatScorecardSummary(null)).toBeNull()
  })

  it('synthesizes feel from observation polarity when missing', () => {
    const ta = synthesizeThinkAloudFallback({
      reasoning: 'Hmm',
      observations: [{ category: 'trust', polarity: -2, severity: 'medium', note: 'No imprint' }],
    })
    expect(ta.feel?.label).toBe('irritiert')
    expect(ta.feel?.valence).toBe(-2)
  })
})
