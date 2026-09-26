import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createJevDecisions,
  parseDecisionsResponse,
  JevClientError,
} from '@/lib/jev/client'
import { isJevActEnabled, isJevShadowEnabled, useCaseEnvSuffix } from '@/lib/jev/env'
import { runShadowDecision } from '@/lib/jev/shadow'
import {
  JEV_USE_CASES,
  questionsFrictionSeverity,
  questionsInsightTriage,
} from '@/lib/jev/catalog'

describe('jev env', () => {
  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.JEV_SHADOW_ENABLED
    delete process.env.JEV_SHADOW_AUDION_FRICTION_SEVERITY
    delete process.env.JEV_ACT_AUDION_FRICTION_SEVERITY
  })

  it('maps use case ids to env suffixes', () => {
    expect(useCaseEnvSuffix('audion.friction_severity')).toBe('AUDION_FRICTION_SEVERITY')
    expect(useCaseEnvSuffix('audion.insight_triage')).toBe('AUDION_INSIGHT_TRIAGE')
  })

  it('requires key + global shadow', () => {
    expect(isJevShadowEnabled(JEV_USE_CASES.audionFrictionSeverity)).toBe(false)
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.JEV_SHADOW_ENABLED = '1'
    expect(isJevShadowEnabled(JEV_USE_CASES.audionFrictionSeverity)).toBe(true)
    process.env.JEV_SHADOW_AUDION_FRICTION_SEVERITY = '0'
    expect(isJevShadowEnabled(JEV_USE_CASES.audionFrictionSeverity)).toBe(false)
  })

  it('act defaults off', () => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    expect(isJevActEnabled(JEV_USE_CASES.audionFrictionSeverity)).toBe(false)
    process.env.JEV_ACT_AUDION_FRICTION_SEVERITY = '1'
    expect(isJevActEnabled(JEV_USE_CASES.audionFrictionSeverity)).toBe(true)
  })
})

describe('parseDecisionsResponse', () => {
  it('parses choices from nested answers map', () => {
    const r = parseDecisionsResponse(
      {
        model: 'typesafe/jev-1.13',
        answers: {
          severity: {
            type: 'choice',
            choice: 'high',
            confidence: 0.8,
          },
          triage: { type: 'choice', key: 'watch' },
        },
        usage: { cost: 0.00002, input_tokens: 40 },
      },
      90,
    )
    expect(r.choices.severity.key).toBe('high')
    expect(r.choices.triage.key).toBe('watch')
    expect(r.usage?.promptTokens).toBe(40)
    expect(r.latencyMs).toBe(90)
  })
})

describe('createJevDecisions + shadow schedule', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.JEV_SHADOW_ENABLED = '1'
    process.env.OPENROUTER_API_BASE_URL = 'https://openrouter.test'
  })

  it('posts to decisions endpoint', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          choices: { severity: { key: 'medium' } },
          usage: { cost: 0.001 },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const result = await createJevDecisions({
      state: { description: 'unclear CTA' },
      questions: questionsFrictionSeverity(),
      fetchImpl,
    })
    expect(result.choices.severity.key).toBe('medium')
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/alpha/decisions')
    expect(init.method).toBe('POST')
  })

  it('throws when unconfigured', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(
      createJevDecisions({
        state: {},
        questions: questionsInsightTriage(),
      }),
    ).rejects.toBeInstanceOf(JevClientError)
  })

  it('runShadowDecision compares baseline and fail-opens', async () => {
    const logs: unknown[] = []
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: 'typesafe/jev-1.13',
          choices: { triage: { key: 'act_now' } },
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch

    const compare = await runShadowDecision({
      useCaseId: JEV_USE_CASES.audionInsightTriage,
      state: { title: 'Broken nav' },
      questions: questionsInsightTriage(),
      baseline: 'act_now',
      extractJev: (r) => r.choices.triage?.key ?? null,
      awaitResult: true,
      fetchImpl,
      log: (c) => logs.push(c),
    })
    expect(compare?.agree).toBe(true)
    expect(logs).toHaveLength(1)

    const fail = await runShadowDecision({
      useCaseId: JEV_USE_CASES.audionInsightTriage,
      state: {},
      questions: questionsInsightTriage(),
      baseline: 'watch',
      extractJev: () => null,
      awaitResult: true,
      fetchImpl: vi.fn(async () => new Response('nope', { status: 500 })) as unknown as typeof fetch,
      log: () => {},
    })
    expect(fail?.agree).toBeNull()
    expect(fail?.error).toBeTruthy()
  })
})
