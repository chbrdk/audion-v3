import { describe, expect, it } from 'vitest'
import {
  formatPersonaPolicySummary,
  toAgentPersonaContext,
} from '../lib/chat/persona-agent-context'
import { DEMO_PERSONAS } from '../lib/fixtures/personas'

describe('toAgentPersonaContext', () => {
  it('maps Alex Morgan into nested Agent PersonaContext with DSL overrides', () => {
    const alex = DEMO_PERSONAS.find((p) => p.id === 'persona-alex-morgan')!
    const ctx = toAgentPersonaContext(alex, {
      locale: 'de',
      systemPrompt: 'You are Alex.',
    })
    expect(ctx).toBeTruthy()
    expect(ctx && 'profile' in ctx && ctx.profile.bio).toContain('Outcome-driven')
    expect(ctx && 'profile' in ctx && ctx.profile.goals?.length).toBeGreaterThan(0)
    expect(ctx && 'profile' in ctx && ctx.profile.painPoints?.length).toBeGreaterThan(0)
    expect(ctx && 'profile' in ctx && ctx.profile.traits?.[0]).toMatch(/Analytical/)
    expect(ctx && 'headline' in ctx && ctx.headline).toBe('Product Lead')
    expect(ctx && 'dimensionOverrides' in ctx && ctx.dimensionOverrides?.detail_orientation).toBe(
      0.88,
    )
    expect(ctx && 'dos' in ctx && ctx.dos?.[0]).toMatch(/official navigation/i)
    expect(ctx && 'donts' in ctx && ctx.donts?.[0]).toMatch(/marketing cookies/i)
    expect(ctx && 'heuristics' in ctx && ctx.heuristics?.[0]).toMatch(/dated working briefs/i)
    expect(ctx && 'profile' in ctx && ctx.profile.techLiteracy).toBe(0.82)
    expect(ctx && 'profile' in ctx && ctx.profile.motivations?.[0]?.label).toMatch(/traceable/i)
    expect(ctx && 'profile' in ctx && ctx.profile.priorKnowledge?.[0]?.title).toMatch(/Operational/i)
    expect(ctx && 'profile' in ctx && ctx.profile.attentionSpan).toMatch(/Focused bursts/i)
    expect(ctx && 'extraInstructions' in ctx && ctx.extraInstructions).toMatch(/Mindset:/)
    expect(ctx && 'extraInstructions' in ctx && ctx.extraInstructions).toMatch(/Context:/)
    expect(ctx && 'locale' in ctx && ctx.locale).toBe('de')
    expect(ctx && 'systemPrompt' in ctx && ctx.systemPrompt).toBe('You are Alex.')
  })

  it('formats policy summary for the inspect dock', () => {
    expect(
      formatPersonaPolicySummary({
        dimensions: {
          detail_orientation: 0.88,
          trust_skepticism: 0.78,
          exploration: 0.45,
        },
        heuristics: ['a', 'b', 'c', 'd'],
      }),
    ).toBe('Policy: detail↑ trust↑ · 4 heuristics')
  })
})
