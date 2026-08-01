import { afterEach, describe, expect, it } from 'vitest'
import { runStubDerivePersonaAgentProfile } from '../lib/ai-workflows'
import {
  deriveJourneyDimensions,
  deriveResearchProfile,
  normalizeDeriveFacets,
  traitSignal,
} from '../lib/persona-agent-derive'
import { resetPersonaStore, storePersonaDetail, storePatchPersona } from '../lib/fixtures/persona-store'

afterEach(() => {
  resetPersonaStore()
})

describe('persona-agent-derive', () => {
  it('scores matching traits', () => {
    expect(traitSignal({ Curious: 0.8, Cautious: 0.9 }, [/curious/i])).toBe(0.8)
    expect(traitSignal({}, [/curious/i], 0.42)).toBe(0.42)
  })

  it('normalizes facets to both by default', () => {
    expect(normalizeDeriveFacets(undefined)).toEqual(['researchProfile', 'journeyBehavior'])
    expect(normalizeDeriveFacets(['journeyBehavior'])).toEqual(['journeyBehavior'])
  })

  it('derives research + dimensions from alex fixture traits', async () => {
    const persona = await storePersonaDetail('persona-alex-morgan')
    expect(persona).toBeTruthy()
    const research = deriveResearchProfile(persona!)
    expect(research.techLiteracy).toBeGreaterThan(0.5)
    expect(research.emotionalBaseline.length).toBeGreaterThan(0)
    expect(research.motivations.length).toBeGreaterThan(0)
    const dims = deriveJourneyDimensions(persona!)
    expect(dims.detailOrientation).toBeGreaterThan(0)
    expect(dims.riskAversion).toBeGreaterThan(0)
  })
})

describe('runStubDerivePersonaAgentProfile', () => {
  it('patches research profile only when facet requested', async () => {
    await storePatchPersona('persona-alex-morgan', {
      techLiteracy: 0.1,
      emotionalBaseline: 'flat',
      stressTriggers: [],
      motivations: [],
    })
    const result = await runStubDerivePersonaAgentProfile('persona-alex-morgan', {
      facets: ['researchProfile'],
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('derivePersonaAgentProfile')
    expect(result.facetsUpdated).toEqual(['researchProfile'])
    expect(result.techLiteracy).toBeGreaterThan(0.1)
    expect(result.motivations.length).toBeGreaterThan(0)
    expect(result.target.path).toBe('/personas/persona-alex-morgan/derive-agent-profile')

    const after = await storePersonaDetail('persona-alex-morgan')
    expect(after?.techLiteracy).toBe(result.techLiteracy)
  })

  it('patches journey behaviour dimensions and lists', async () => {
    await storePatchPersona('persona-alex-morgan', { journeyBehavior: null })
    const result = await runStubDerivePersonaAgentProfile('persona-alex-morgan', {
      facets: ['journeyBehavior'],
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.facetsUpdated).toEqual(['journeyBehavior'])
    expect(result.journeyBehavior?.dimensionOverrides?.detailOrientation).toBeTypeOf('number')
    expect((result.journeyBehavior?.dos ?? []).length).toBeGreaterThan(0)
    expect((await storePersonaDetail('persona-alex-morgan'))?.journeyBehavior).toEqual(
      result.journeyBehavior,
    )
  })

  it('returns 404 for missing persona', async () => {
    expect(await runStubDerivePersonaAgentProfile('missing', {})).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })
})
