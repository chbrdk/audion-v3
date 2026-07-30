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
  it('buildTargetCall fills path params', () => {
    const call = buildTargetCall(
      'generatePersonas',
      { tgId: 'tg-digital-product-leads' },
      { segment: 'Leads', filter_mode: 'auto' },
    )
    expect(call.method).toBe('POST')
    expect(call.path).toBe('/target-groups/tg-digital-product-leads/personas/generate')
    expect(call.body.segment).toBe('Leads')
  })

  it('registry documents V2 upstream paths', () => {
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

  it('generatePersonas creates fixture personas and returns stubbed target', () => {
    const before = storePersonaList().total
    const result = runStubGeneratePersonas('tg-digital-product-leads', {
      segment: 'Digital leads',
      count: 2,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generatePersonas')
    expect(result.target.path).toContain('tg-digital-product-leads/personas/generate')
    expect(result.personas).toHaveLength(2)
    expect(storePersonaList().total).toBe(before + 2)
    const tg = storeTargetGroupDetail('tg-digital-product-leads')
    expect(tg?.linkedPersonas.some((p) => p.id === result.personas[0]!.id)).toBe(true)
  })

  it('suggestTargetGroups returns suggestions with target meta', () => {
    const result = runStubSuggestTargetGroups('proj-audion-core', { max_suggestions: 3 })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.suggestions).toHaveLength(3)
    expect(result.target.path).toContain('proj-audion-core/suggest-target-groups')
  })

  it('suggestPersonas requires a known target group', () => {
    const missing = runStubSuggestPersonas('proj-audion-core', {
      target_group_id: 'missing',
    })
    expect(missing).toMatchObject({ error: 'Target group not found', status: 404 })

    const result = runStubSuggestPersonas('proj-audion-core', {
      target_group_id: 'tg-digital-product-leads',
      max_suggestions: 2,
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.suggestions).toHaveLength(2)
    expect(result.target.path).toContain('suggest-personas')
  })

  it('researchStart returns queued stub job', () => {
    const result = runStubResearchStart('proj-audion-core', {
      seed_url: 'https://example.com',
    })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.status).toBe('queued')
    expect(result.jobId).toMatch(/^research-stub-/)
    expect(result.target.body.seed_url).toBe('https://example.com')
  })

  it('generateJourney creates journey with phases', () => {
    const result = runStubGenerateJourney(
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
    const journey = storeJourneyDetail(result.journey.id)
    expect(journey?.phases).toHaveLength(3)
  })

  it('generatePersonaAvatar cycles fixture portrait and returns stubbed target', () => {
    const before = storePersonaDetail('persona-alex-morgan')
    expect(before?.avatarUrl).toBeTruthy()
    const result = runStubGeneratePersonaAvatar('persona-alex-morgan', {})
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generatePersonaAvatar')
    expect(result.target.path).toBe('/personas/persona-alex-morgan/generate-image')
    expect(result.avatarUrl).toBeTruthy()
    expect(result.avatarUrl).not.toBe(before?.avatarUrl)
    expect(storePersonaDetail('persona-alex-morgan')?.avatarUrl).toBe(result.avatarUrl)

    const missing = runStubGeneratePersonaAvatar('missing-persona', {})
    expect(missing).toMatchObject({ error: 'Persona not found', status: 404 })
  })

  it('suggestPersonaField returns stub suggestions without patching', () => {
    const before = storePersonaDetail('persona-alex-morgan')
    const interests = before?.interests ?? []
    const result = runStubSuggestPersonaField('persona-alex-morgan', {
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
    expect(storePersonaDetail('persona-alex-morgan')?.interests).toEqual(interests)

    const vocab = runStubSuggestPersonaField('persona-alex-morgan', { field: 'vocabulary' })
    expect('error' in vocab).toBe(false)
    if ('error' in vocab) return
    expect(vocab.target.path).toBe('/ai-assist')
    expect(vocab.target.body.template_id).toBe('persona.vocabulary')

    expect(runStubSuggestPersonaField('missing', { field: 'values' })).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })

  it('enrichPersona merges facets into the fixture store', () => {
    const before = storePersonaDetail('persona-alex-morgan')
    expect(before).toBeTruthy()
    const interestCount = before!.interests.length
    const result = runStubEnrichPersona('persona-alex-morgan', { output_locale: 'en' })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('enrichPersona')
    expect(result.target.path).toBe('/personas/persona-alex-morgan/enrich')
    expect(result.facetsUpdated).toContain('interests')
    expect(result.interests.length).toBeGreaterThan(interestCount)
    expect(storePersonaDetail('persona-alex-morgan')?.interests).toEqual(result.interests)

    expect(runStubEnrichPersona('missing', {})).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })

  it('generateMoodboard writes style keywords and tiles', () => {
    const result = runStubGenerateMoodboard('persona-alex-morgan', {})
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.stubbed).toBe(true)
    expect(result.workflowId).toBe('generateMoodboard')
    expect(result.status).toBe('stubbed')
    expect(result.visuals.styleKeywords.length).toBeGreaterThan(0)
    expect(result.visuals.tiles.length).toBe(4)
    expect(result.visuals.tiles[0]?.imageUrl).toContain('/fixtures/personas/visuals/')
    expect(storePersonaDetail('persona-alex-morgan')?.visuals?.tiles).toHaveLength(4)

    expect(runStubGenerateMoodboard('missing', {})).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })

  it('generateMoodboard preserves locked tiles across rebuild', () => {
    resetPersonaStore()
    const first = runStubGenerateMoodboard('persona-alex-morgan', {})
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
    storePatchPersona('persona-alex-morgan', {
      visuals: {
        styleKeywords: first.visuals.styleKeywords,
        tiles: [
          lockedTone,
          ...first.visuals.tiles.slice(1).map((t) => ({ ...t, locked: false })),
        ],
      },
    })

    const second = runStubGenerateMoodboard('persona-alex-morgan', {})
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

  it('generateJourneyPhaseMoments merges moments into a phase', () => {
    const before = storeJourneyDetail('journey-product-discovery')
    const phase = before!.phases[0]!
    const count = phase.elements.length
    const result = runStubGenerateJourneyPhaseMoments('journey-product-discovery', {
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
      storeJourneyDetail('journey-product-discovery')?.phases[0]?.elements.length,
    ).toBeGreaterThan(count)

    expect(
      runStubGenerateJourneyPhaseMoments('journey-product-discovery', { phase_id: 'missing' }),
    ).toMatchObject({ error: 'Phase not found', status: 404 })
  })

  it('validateJourney returns a fit report against a persona', () => {
    const result = runStubValidateJourney('journey-product-discovery', {
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

    expect(runStubValidateJourney('journey-product-discovery', { persona_ids: [] })).toMatchObject({
      error: 'At least one persona_id required',
      status: 400,
    })
  })

  it('validateJourney chat mode adds persona quotes and appends history', () => {
    const first = runStubValidateJourney('journey-product-discovery', {
      persona_ids: ['persona-alex-morgan'],
      mode: 'automated',
    })
    expect('error' in first).toBe(false)

    const chat = runStubValidateJourney('journey-product-discovery', {
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
