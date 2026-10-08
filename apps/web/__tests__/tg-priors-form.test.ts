import { describe, expect, it } from 'vitest'
import {
  buildBehavioralPriorsPayload,
  emptyTgPriorsForm,
  tgPriorsFormFromStored,
} from '../lib/behavior/tg-priors-form'

describe('tg-priors-form', () => {
  it('returns null when the band is empty', () => {
    expect(buildBehavioralPriorsPayload(emptyTgPriorsForm())).toBeNull()
  })

  it('emits blend default 0.25 when only cues are set', () => {
    const payload = buildBehavioralPriorsPayload({
      ...emptyTgPriorsForm(),
      segmentCues: ['impatient', 'B2B'],
    })
    expect(payload).toEqual({
      blendWeight: 0.25,
      segmentCues: ['impatient', 'B2B'],
    })
  })

  it('round-trips stored priors into the form and back', () => {
    const stored = {
      blendWeight: 0.4,
      dimensions: { timePressure: 0.9, warmth: 0.2 },
      sharedStressTriggers: ['cookie wall'],
      sharedAvoidances: ['long forms'],
    }
    const form = tgPriorsFormFromStored(stored)
    expect(form.blendWeight).toBe(0.4)
    expect(form.dimensions.timePressure).toBe(0.9)
    const built = buildBehavioralPriorsPayload(form)
    expect(built?.blendWeight).toBe(0.4)
    expect(built?.dimensions?.timePressure).toBe(0.9)
    expect(built?.sharedStressTriggers).toEqual(['cookie wall'])
    expect(built?.sharedAvoidances).toEqual(['long forms'])
  })

  it('clear form builds null even after prior edits', () => {
    const form = tgPriorsFormFromStored({
      blendWeight: 0.5,
      dimensions: { trustSkepticism: 0.8 },
    })
    expect(buildBehavioralPriorsPayload(emptyTgPriorsForm())).toBeNull()
    expect(form.dimensions.trustSkepticism).toBe(0.8)
  })
})
