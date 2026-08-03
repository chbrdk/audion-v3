import { describe, expect, it } from 'vitest'
import { demoPersonaDetail } from '../lib/fixtures/personas'
import {
  baselineBGoldSnapshot,
  correlatePersonaLabRun,
  optimisticAgentSnapshot,
  PERSONA_LAB_GOLD,
  waveRunToPersonaLabSnapshot,
} from '../lib/persona-lab-correlate'
import { createStudyFromScenarioPack, getScenarioPack } from '../lib/scenario-packs'
import { paths } from '../lib/paths'
import { dimensionOverridesForAgent, toAgentPersonaContext } from '../lib/chat/persona-agent-context'
import { resetUxStudyStore } from '../lib/fixtures/ux-study-store'
import type { UxWaveRunItem } from '@audion-v3/contracts'

describe('persona lab pack + self-correlation', () => {
  it('registers lab pack with single B run and maxSteps 15', () => {
    const pack = getScenarioPack(paths.personaLabPackId)
    expect(pack).not.toBeNull()
    expect(pack!.runs).toHaveLength(1)
    expect(pack!.runs[0]?.runKey).toBe(PERSONA_LAB_GOLD.runKey)
    expect(pack!.runs[0]?.maxSteps).toBe(PERSONA_LAB_GOLD.maxStepsCap)
    expect(pack!.runs[0]?.personaId).toBe(paths.personaLabImpatientPersonaId)
  })

  it('lab impatient persona wires timePressure ≥ gold min into agent context', () => {
    const persona = demoPersonaDetail(paths.personaLabImpatientPersonaId)
    expect(persona).not.toBeNull()
    expect(persona!.traits.Patient).toBeLessThan(0.3)
    expect(persona!.traits.Impatient).toBeGreaterThan(0.8)
    const overrides = dimensionOverridesForAgent(persona!.journeyBehavior?.dimensionOverrides)
    expect(overrides?.time_pressure).toBeGreaterThanOrEqual(PERSONA_LAB_GOLD.timePressureMin)
    const ctx = toAgentPersonaContext(persona)
    expect(ctx && 'dimensionOverrides' in ctx && ctx.dimensionOverrides?.time_pressure).toBe(
      overrides?.time_pressure,
    )
  })

  it('correlates baseline-like gold snapshot as closer', () => {
    const result = correlatePersonaLabRun(baselineBGoldSnapshot())
    expect(result.closer).toBe(true)
    expect(result.score).toBeGreaterThanOrEqual(PERSONA_LAB_GOLD.closerScoreThreshold)
    expect(result.checks.every((c) => c.pass)).toBe(true)
  })

  it('correlates optimistic agent snapshot as not closer', () => {
    const result = correlatePersonaLabRun(optimisticAgentSnapshot())
    expect(result.closer).toBe(false)
    expect(result.checks.find((c) => c.id === 'friction_band')?.pass).toBe(false)
    expect(result.checks.find((c) => c.id === 'confusion_named')?.pass).toBe(false)
    expect(result.checks.find((c) => c.id === 'not_optimistic')?.pass).toBe(false)
    expect(result.checks.find((c) => c.id === 'step_budget')?.pass).toBe(false)
  })

  it('maps wave run → snapshot and fails infra-blocked runs', () => {
    const run: UxWaveRunItem = {
      id: 'run-lab-1',
      runKey: 'B-aufgabe1-nachruesten',
      leitfadenBlock: 'lab',
      personaId: paths.personaLabImpatientPersonaId,
      personaName: 'Alex Lab',
      segment: 'owner_upgrade',
      url: paths.boschEbikeProduktkombinationenUrl,
      task: 'lab',
      maxSteps: 15,
      jobId: 'j1',
      agentStatus: 'complete',
      agentSuccess: false,
      taskCompleted: false,
      validEvidence: false,
      validEvidenceCaveat: null,
      blockers: ['cloudfront_403'],
      steps: 3,
      frictionScore: 10,
      personaFitScore: 0,
      goalReached: false,
      finding: '403',
      categories: {},
    }
    const snap = waveRunToPersonaLabSnapshot(run)
    const result = correlatePersonaLabRun(snap)
    expect(result.closer).toBe(false)
    expect(result.checks.find((c) => c.id === 'infra_clean')?.pass).toBe(false)
  })

  it('seeds a study from lab pack with one run', async () => {
    resetUxStudyStore()
    const created = await createStudyFromScenarioPack({
      packId: paths.personaLabPackId,
      waveKey: 'lab-smoke',
      name: 'Persona Lab smoke',
    })
    expect(created).not.toBeNull()
    expect(created!.wave.runs).toHaveLength(1)
    expect(created!.wave.runs[0]?.maxSteps).toBe(15)
    expect(created!.packId).toBe(paths.personaLabPackId)
  })
})
