import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isLabPersonaId,
  LAB_PERSONA_FIXTURE_TO_DB,
  resolveLabPersonaId,
} from '../lib/lab-persona-resolve'
import { createStudyFromScenarioPack, getScenarioPack } from '../lib/scenario-packs'
import { paths } from '../lib/paths'
import { resetUxStudyStore } from '../lib/fixtures/ux-study-store'
import { demoPersonaDetail } from '../lib/fixtures/personas'

afterEach(() => {
  resetUxStudyStore()
  vi.unstubAllEnvs()
})

describe('lab persona resolve (fixture → DB)', () => {
  it('maps fixture aliases to documented staging DB ids by default', () => {
    expect(resolveLabPersonaId(paths.personaLabImpatientPersonaId)).toBe(
      paths.personaLabImpatientDbPersonaId,
    )
    expect(resolveLabPersonaId(paths.personaLabPatientPersonaId)).toBe(
      paths.personaLabPatientDbPersonaId,
    )
    expect(LAB_PERSONA_FIXTURE_TO_DB[paths.personaLabImpatientPersonaId]).toBe(
      'persona-alex-lab-ungeduldig-msdfje0b',
    )
  })

  it('keeps already-DB ids stable and passes unknown ids through', () => {
    expect(resolveLabPersonaId(paths.personaLabImpatientDbPersonaId)).toBe(
      paths.personaLabImpatientDbPersonaId,
    )
    expect(resolveLabPersonaId('persona-alex-nachruester')).toBe('persona-alex-nachruester')
    expect(isLabPersonaId(paths.personaLabImpatientPersonaId)).toBe(true)
    expect(isLabPersonaId('persona-alex-nachruester')).toBe(false)
  })

  it('prefers AUDION_LAB_* env overrides', () => {
    vi.stubEnv(paths.envLabAlexPersonaId, 'persona-custom-alex')
    vi.stubEnv(paths.envLabSamPersonaId, 'persona-custom-sam')
    expect(resolveLabPersonaId(paths.personaLabImpatientPersonaId)).toBe('persona-custom-alex')
    expect(resolveLabPersonaId(paths.personaLabPatientPersonaId)).toBe('persona-custom-sam')
    expect(resolveLabPersonaId(paths.personaLabImpatientDbPersonaId)).toBe('persona-custom-alex')
  })

  it('from-pack Lab B seeds Alex + Sam DB persona ids without manual PATCH', async () => {
    const created = await createStudyFromScenarioPack({
      packId: paths.personaLabPackId,
      waveKey: 'resolve-smoke',
    })
    expect(created).not.toBeNull()
    expect(created!.wave.runs).toHaveLength(2)
    expect(created!.wave.runs[0]?.personaId).toBe(paths.personaLabImpatientDbPersonaId)
    expect(created!.wave.runs[1]?.personaId).toBe(paths.personaLabPatientDbPersonaId)
    const detail = demoPersonaDetail(created!.wave.runs[0]!.personaId!)
    expect(detail?.journeyBehavior?.dimensionOverrides?.timePressure).toBe(0.9)
  })

  it('micro-lab packs register and resolve personas', () => {
    for (const packId of [
      paths.personaLabNavPackId,
      paths.personaLabPurchasePackId,
      paths.personaLabAcPackId,
    ]) {
      expect(getScenarioPack(packId)).not.toBeNull()
    }
    expect(getScenarioPack(paths.personaLabNavPackId)?.runs[0]?.runKey).toBe('Nav-home-to-tool')
    expect(getScenarioPack(paths.personaLabPurchasePackId)?.runs).toHaveLength(1)
    expect(getScenarioPack(paths.personaLabAcPackId)?.runs).toHaveLength(2)
  })

  it('from-pack Nav / Purchase / A+C resolve to DB ids', async () => {
    const nav = await createStudyFromScenarioPack({
      packId: paths.personaLabNavPackId,
      waveKey: 'nav-resolve',
    })
    expect(nav!.wave.runs[0]?.personaId).toBe(paths.personaLabImpatientDbPersonaId)

    const purchase = await createStudyFromScenarioPack({
      packId: paths.personaLabPurchasePackId,
      waveKey: 'purchase-resolve',
    })
    expect(purchase!.wave.runs[0]?.personaId).toBe(paths.personaLabPatientDbPersonaId)

    const ac = await createStudyFromScenarioPack({
      packId: paths.personaLabAcPackId,
      waveKey: 'ac-resolve',
    })
    expect(ac!.wave.runs.map((r) => r.personaId)).toEqual([
      paths.personaLabImpatientDbPersonaId,
      paths.personaLabPatientDbPersonaId,
    ])
  })
})
