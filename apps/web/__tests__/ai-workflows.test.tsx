import { describe, expect, it, afterEach } from 'vitest'
import {
  AI_WORKFLOW_TARGETS,
  buildTargetCall,
  runStubEnrichPersona,
  runStubGenerateJourney,
  runStubGenerateJourneyPhaseMoments,
  runStubGenerateMoodboard,
  runStubGeneratePersonaAvatar,
  runStubGeneratePersonas,
  runStubResearchStart,
  runStubSuggestPersonaField,
  runStubSuggestPersonas,
  runStubSuggestTargetGroups,
  runStubValidateJourney,
} from '../lib/ai-workflows'
import { resetPersonaStore, storePatchPersona, storePersonaDetail, storePersonaList } from '../lib/fixtures/persona-store'
import { resetTargetGroupStore, storeTargetGroupDetail } from '../lib/fixtures/target-group-store'
import { resetJourneyStore, storeJourneyDetail } from '../lib/fixtures/journey-store'
import {
  resetJourneyValidationStore,
  storeListValidationReports,
} from '../lib/fixtures/journey-validation-store'
import { resetProjectStore } from '../lib/fixtures/project-store'

afterEach(() => {
  resetPersonaStore()
  resetTargetGroupStore()
  resetJourneyStore()
  resetJourneyValidationStore()
  resetProjectStore()
})

describe('AI workflow stubs', () => {
  it('buildTargetCall fills path params', async () => {
    const call = buildTargetCall(
      'generatePersonas',
      { tgId: 'tg-digital-product-leads' },
      { segment: 'Leads', filter_mode: 'auto' },
    )
    expect(call.method).toBe('POST')
    expect(call.path).toBe('/target-groups/tg-digital-product-leads/personas/generate')
    expect(call.body.segment).toBe('Leads')
  })

  it('registry documents V2 upstream paths', async () => {
    expect(AI_WORKFLOW_TARGETS.generatePersonas.upstreamPath).toContain(
      '/personas/generate',
    )
    expect(AI_WORKFLOW_TARGETS.generatePersonaAvatar.upstreamPath).toContain(
      '/generate-image',
    )
    expect(AI_WORKFLOW_TARGETS.suggestPersonaField.upstreamPath).toContain('/ai/')
    expect(AI_WORKFLOW_TARGETS.enrichPersona.upstreamPath).toBe('/personas/{personaId}/enrich')
    expect(AI_WORKFLOW_TARGETS.generateMoodboard.upstreamPath).toContain('/moodboards')
    expect(AI_WORKFLOW_TARGETS.suggestTargetGroups.upstreamPath).toContain(
      'suggest-target-groups',
    )
    expect(AI_WORKFLOW_TARGETS.researchStart.upstreamPath).toContain('research/start')
    expect(AI_WORKFLOW_TARGETS.generateJourney.upstreamPath).toBe('/journeys/generate')
    expect(AI_WORKFLOW_TARGETS.generateJourneyPhaseMoments.upstreamPath).toContain('/ai/generate')
    expect(AI_WORKFLOW_TARGETS.validateJourney.upstreamPath).toContain('/validate')
  })

  it('generatePersonas creates fixture personas and returns stubbed target', async () => {
    const before = (await storePersonaList()).total
    const result = await runStubGeneratePersonas('tg-digital-product-leads', {
      segment: 'Digital leads',
      count: 2,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generatePersonas')
    expect(result.target.path).toContain('tg-digital-product-leads/personas/generate')
    expect(result.personas).toHaveLength(2)
    expect((await storePersonaList()).total).toBe(before + 2)
    const tg = await storeTargetGroupDetail('tg-digital-product-leads')
    expect(tg?.linkedPersonas.some((p) => p.id === result.personas[0]!.id)).toBe(true)
  })

  it('suggestTargetGroups returns suggestions with target meta', async () => {
    const result = await runStubSuggestTargetGroups('proj-audion-core', { max_suggestions: 3 })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.suggestions).toHaveLength(3)
    expect(result.target.path).toContain('proj-audion-core/suggest-target-groups')
  })

  it('suggestPersonas requires a known target group', async () => {
    const missing = await runStubSuggestPersonas('proj-audion-core', {
      target_group_id: 'missing',
    })
    expect(missing).toMatchObject({ error: 'Target group not found', status: 404 })

    const result = await runStubSuggestPersonas('proj-audion-core', {
      target_group_id: 'tg-digital-product-leads',
      max_suggestions: 2,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.suggestions).toHaveLength(2)
    expect(result.target.path).toContain('suggest-personas')
  })

  it('researchStart returns queued stub job', async () => {
    const result = await runStubResearchStart('proj-audion-core', {
      seed_url: 'https://example.com',
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.status).toBe('queued')
    expect(result.jobId).toMatch(/^research-stub-/)
    expect(result.target.body.seed_url).toBe('https://example.com')
  })

  it('generateJourney creates journey with phases', async () => {
    const result = await runStubGenerateJourney(
      {
        target_group_id: 'tg-digital-product-leads',
        journey_type: 'customer',
        project_id: 'proj-audion-core',
      },
      'proj-audion-core',
    )
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generateJourneyFromProject')
    expect(result.journey.phaseCount).toBe(3)
    const journey = await storeJourneyDetail(result.journey.id)
    expect(journey?.phases).toHaveLength(3)
  })

  it('generatePersonaAvatar cycles fixture portrait and returns stubbed target', async () => {
    const before = await storePersonaDetail('persona-alex-morgan')
    expect(before?.avatarUrl).toBeTruthy()
    const result = await runStubGeneratePersonaAvatar('persona-alex-morgan', {})
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generatePersonaAvatar')
    expect(result.target.path).toBe('/personas/persona-alex-morgan/generate-image')
    expect(result.avatarUrl).toBeTruthy()
    expect(result.avatarUrl).not.toBe(before?.avatarUrl)
    expect((await storePersonaDetail('persona-alex-morgan'))?.avatarUrl).toBe(result.avatarUrl)

    const missing = await runStubGeneratePersonaAvatar('missing-persona', {})
    expect(missing).toMatchObject({ error: 'Persona not found', status: 404 })
  })

  it('suggestPersonaField returns stub suggestions without patching', async () => {
    const before = await storePersonaDetail('persona-alex-morgan')
    const interests = before?.interests ?? []
    const result = await runStubSuggestPersonaField('persona-alex-morgan', {
      field: 'interests',
      max_suggestions: 3,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('suggestPersonaField')
    expect(result.field).toBe('interests')
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.target.path).toContain('/ai/interests')
    expect((await storePersonaDetail('persona-alex-morgan'))?.interests).toEqual(interests)

    const vocab = await runStubSuggestPersonaField('persona-alex-morgan', { field: 'vocabulary' })
    expect('error' in vocab).toBe(false)
    if ('error' in vocab) return
    expect(vocab.target.path).toBe('/ai-assist')
    expect(vocab.target.body.template_id).toBe('persona.vocabulary')

    expect(await runStubSuggestPersonaField('missing', { field: 'values' })).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })

  it('enrichPersona merges facets into the fixture store', async () => {
    const before = await storePersonaDetail('persona-alex-morgan')
    expect(before).toBeTruthy()
    const interestCount = before!.interests.length
    const result = await runStubEnrichPersona('persona-alex-morgan', { output_locale: 'en' })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('enrichPersona')
    expect(result.target.path).toBe('/personas/persona-alex-morgan/enrich')
    expect(result.facetsUpdated).toContain('interests')
    expect(result.interests.length).toBeGreaterThan(interestCount)
    expect((await storePersonaDetail('persona-alex-morgan'))?.interests).toEqual(result.interests)

    expect(await runStubEnrichPersona('missing', {})).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })

  it('generateMoodboard writes style keywords and tiles', async () => {
    const result = await runStubGenerateMoodboard('persona-alex-morgan', {})
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generateMoodboard')
    expect(result.status).toBe('stubbed')
    expect(result.visuals.styleKeywords.length).toBeGreaterThan(0)
    expect(result.visuals.tiles.length).toBe(4)
    expect(result.visuals.tiles[0]?.imageUrl).toContain('/fixtures/personas/visuals/')
    expect((await storePersonaDetail('persona-alex-morgan'))?.visuals?.tiles).toHaveLength(4)

    expect(await runStubGenerateMoodboard('missing', {})).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })

  it('generateMoodboard preserves locked tiles across rebuild', async () => {
    resetPersonaStore()
    const first = await runStubGenerateMoodboard('persona-alex-morgan', {})
    expect('error' in first).toBe(false)
    if ('error' in first) return

    const lockedTone = {
      ...first.visuals.tiles[0]!,
      id: 'locked-tone-keep',
      category: 'tone',
      imageUrl: '/fixtures/personas/visuals/locked-keep.svg',
      caption: 'Locked atmosphere',
      locked: true,
    }
    await storePatchPersona('persona-alex-morgan', {
      visuals: {
        styleKeywords: first.visuals.styleKeywords,
        tiles: [
          lockedTone,
          ...first.visuals.tiles.slice(1).map((t) => ({ ...t, locked: false })),
        ],
      },
    })

    const second = await runStubGenerateMoodboard('persona-alex-morgan', {})
    expect('error' in second).toBe(false)
    if ('error' in second) return

    const tone = second.visuals.tiles.find((t) => t.category.toLowerCase() === 'tone')
    expect(tone).toMatchObject({
      id: 'locked-tone-keep',
      imageUrl: '/fixtures/personas/visuals/locked-keep.svg',
      locked: true,
    })
    expect(second.visuals.tiles.filter((t) => t.locked)).toHaveLength(1)
    expect(second.visuals.tiles.some((t) => t.category === 'material' && !t.locked)).toBe(true)
  })

  it('generateJourneyPhaseMoments merges moments into a phase', async () => {
    const before = await storeJourneyDetail('journey-product-discovery')
    const phase = before!.phases[0]!
    const count = phase.elements.length
    const result = await runStubGenerateJourneyPhaseMoments('journey-product-discovery', {
      phase_id: phase.id,
      max_suggestions: 3,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generateJourneyPhaseMoments')
    expect(result.applied).toBe(true)
    expect(result.moments.length).toBeGreaterThan(count)
    expect(result.target.body.template_id).toBe('journey.moments')
    expect(
      (await storeJourneyDetail('journey-product-discovery'))?.phases[0]?.elements.length,
    ).toBeGreaterThan(count)

    expect(
      await runStubGenerateJourneyPhaseMoments('journey-product-discovery', { phase_id: 'missing' }),
    ).toMatchObject({ error: 'Phase not found', status: 404 })
  })

  it('validateJourney returns a fit report against a persona', async () => {
    const result = await runStubValidateJourney('journey-product-discovery', {
      persona_ids: ['persona-alex-morgan'],
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('validateJourney')
    expect(result.mode).toBe('automated')
    expect(result.reportId).toBeTruthy()
    expect(result.overallFitScore).toBeGreaterThan(0)
    expect(result.phases.length).toBe(4)
    expect(result.phases[0]?.status).toMatch(/good|warning|critical/)
    expect(storeListValidationReports('journey-product-discovery').total).toBe(1)

    expect(await runStubValidateJourney('journey-product-discovery', { persona_ids: [] })).toMatchObject({
      error: 'At least one persona_id required',
      status: 400,
    })
  })

  it('validateJourney chat mode adds persona quotes and appends history', async () => {
    const first = await runStubValidateJourney('journey-product-discovery', {
      persona_ids: ['persona-alex-morgan'],
      mode: 'automated',
    })
    expect('error' in first).toBe(false)

    const chat = await runStubValidateJourney('journey-product-discovery', {
      persona_ids: ['persona-alex-morgan'],
      mode: 'chat',
    })
    expect('error' in chat).toBe(false)
    if ('error' in chat) return
    expect(chat.mode).toBe('chat')
    expect(chat.phases.some((p) => p.frictionPoints.some((fp) => Boolean(fp.personaQuote)))).toBe(
      true,
    )
    expect(storeListValidationReports('journey-product-discovery').total).toBe(2)
  })
})
