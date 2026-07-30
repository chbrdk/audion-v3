import { describe, expect, it, afterEach } from 'vitest'
import {
  AI_WORKFLOW_TARGETS,
  buildTargetCall,
  runStubGenerateJourney,
  runStubGeneratePersonaAvatar,
  runStubGeneratePersonas,
  runStubResearchStart,
  runStubSuggestPersonaField,
  runStubSuggestPersonas,
  runStubSuggestTargetGroups,
} from '../lib/ai-workflows'
import { resetPersonaStore, storePersonaDetail, storePersonaList } from '../lib/fixtures/persona-store'
import { resetTargetGroupStore, storeTargetGroupDetail } from '../lib/fixtures/target-group-store'
import { resetJourneyStore, storeJourneyDetail } from '../lib/fixtures/journey-store'
import { resetProjectStore } from '../lib/fixtures/project-store'

afterEach(() => {
  resetPersonaStore()
  resetTargetGroupStore()
  resetJourneyStore()
  resetProjectStore()
})

describe('AI workflow stubs', () => {
  it('registry documents V2 upstream paths', () => {
    expect(AI_WORKFLOW_TARGETS.generatePersonas.upstreamPath).toContain(
      '/personas/generate',
    )
    expect(AI_WORKFLOW_TARGETS.generatePersonaAvatar.upstreamPath).toContain(
      '/generate-image',
    )
    expect(AI_WORKFLOW_TARGETS.suggestPersonaField.upstreamPath).toContain('/ai/')
    expect(AI_WORKFLOW_TARGETS.suggestTargetGroups.upstreamPath).toContain(
      'suggest-target-groups',
    )
    expect(AI_WORKFLOW_TARGETS.researchStart.upstreamPath).toContain('research/start')
    expect(AI_WORKFLOW_TARGETS.generateJourney.upstreamPath).toBe('/api/journeys/generate')
  })

  it('buildTargetCall fills path params', () => {
    const call = buildTargetCall(
      'generatePersonas',
      { tgId: 'tg-digital-product-leads' },
      { segment: 'Leads', filter_mode: 'auto' },
    )
    expect(call.method).toBe('POST')
    expect(call.path).toBe('/api/target-groups/tg-digital-product-leads/personas/generate')
    expect(call.body.segment).toBe('Leads')
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
    expect(result.target.path).toBe('/api/persona-admin/persona-alex-morgan/generate-image')
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
    expect(vocab.target.path).toBe('/api/ai-assist')
    expect(vocab.target.body.template_id).toBe('persona.vocabulary')

    expect(runStubSuggestPersonaField('missing', { field: 'values' })).toMatchObject({
      error: 'Persona not found',
      status: 404,
    })
  })
})
