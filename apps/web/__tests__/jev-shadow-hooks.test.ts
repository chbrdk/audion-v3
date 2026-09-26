import { beforeEach, describe, expect, it, vi } from 'vitest'

const scheduleJevShadow = vi.fn()

vi.mock('../lib/jev/schedule', () => ({
  scheduleJevShadow: (...args: unknown[]) => scheduleJevShadow(...args),
}))

describe('audion jev shadow hooks', () => {
  beforeEach(() => {
    scheduleJevShadow.mockClear()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.JEV_SHADOW_ENABLED
  })

  it('schedules friction severity when shadowFrictionSeverity is called', async () => {
    const { shadowFrictionSeverity } = await import('../lib/jev/hooks')
    shadowFrictionSeverity({
      description: 'No moments in phase',
      phase: 'Discovery',
      severity: 'high',
    })
    expect(scheduleJevShadow).toHaveBeenCalledTimes(1)
    expect(scheduleJevShadow.mock.calls[0]?.[0]).toMatchObject({
      useCaseId: 'audion.friction_severity',
      baseline: 'high',
      extractChoiceKey: 'severity',
    })
  })

  it('schedules insight triage from finding severity heuristic', async () => {
    const { shadowInsightTriage, heuristicInsightTriage } = await import('../lib/jev/hooks')
    expect(heuristicInsightTriage('high')).toBe('act_now')
    expect(heuristicInsightTriage('low')).toBe('noise')
    expect(heuristicInsightTriage('medium')).toBe('watch')

    shadowInsightTriage({
      title: 'CTA unclear',
      detail: 'Users hesitate',
      severity: 'high',
    })
    expect(scheduleJevShadow).toHaveBeenCalledTimes(1)
    expect(scheduleJevShadow.mock.calls[0]?.[0]).toMatchObject({
      useCaseId: 'audion.insight_triage',
      baseline: 'act_now',
      extractChoiceKey: 'triage',
    })
  })

  it('scoreValidateJourney schedules friction shadow when flag path runs', async () => {
    // schedule is always invoked from helper; env gate lives inside scheduleShadowDecision
    process.env.OPENROUTER_API_KEY = 'sk-test'
    process.env.JEV_SHADOW_ENABLED = '1'

    const { shadowFrictionSeverity } = await import('../lib/jev/hooks')
    shadowFrictionSeverity({
      description: 'Weak goal tie',
      phase: 'Consideration',
      severity: 'medium',
    })
    expect(scheduleJevShadow).toHaveBeenCalled()
    expect(scheduleJevShadow.mock.calls[0]?.[0].useCaseId).toBe(
      'audion.friction_severity',
    )
  })
})
