import { afterEach, describe, expect, it } from 'vitest'
import {
  resetPersonaStore,
  storeCreatePersona,
  storePatchPersona,
  storePersonaDetail,
  storePersonaList,
} from '../lib/fixtures/persona-store'
import {
  resetTargetGroupStore,
  storeCreateTargetGroup,
  storePatchTargetGroup,
  storeTargetGroupDetail,
  storeTargetGroupForPersona,
  storeTargetGroupList,
} from '../lib/fixtures/target-group-store'
import {
  resetJourneyStore,
  storeCreateJourney,
  storeDeleteJourney,
  storeJourneyDetail,
  storeJourneyList,
  storePatchJourney,
} from '../lib/fixtures/journey-store'
import { demoPersonaDetail, demoPersonaList } from '../lib/fixtures/personas'
import { filterPersonaList, normalizePersonaDetail, normalizePersonaSummary } from '../lib/personas'
import {
  filterTargetGroupList,
  normalizeTargetGroupDetail,
  normalizeTargetGroupSummary,
} from '../lib/target-groups'
import {
  filterJourneyList,
  normalizeJourneyDetail,
  normalizeJourneySummary,
} from '../lib/journeys'

afterEach(() => {
  resetPersonaStore()
  resetTargetGroupStore()
  resetJourneyStore()
})

describe('persona contracts', () => {
  it('normalizes summary payloads from legacy backend fields', () => {
    expect(
      normalizePersonaSummary({
        persona_id: 'persona-1',
        name: 'Alex Morgan',
        job_title: 'Product Lead',
        status: 'ready',
      }),
    ).toEqual({
      id: 'persona-1',
      name: 'Alex Morgan',
      role: 'Product Lead',
      projectId: null,
      status: 'ready',
      archetype: null,
      updatedAt: null,
      avatarUrl: null,
    })
  })

  it('normalizes detail payloads and filters list by query', () => {
    const detail = normalizePersonaDetail({
      id: 'persona-1',
      name: 'Alex Morgan',
      role: 'Product Lead',
      avatar_url: '/fixtures/personas/persona-1.svg',
      description: 'Drives roadmap decisions.',
      goals: ['Reduce uncertainty'],
      frustrations: ['Slow approvals'],
      channels: ['Slack'],
      sections: [{ title: 'Mindset', body: 'Outcome oriented' }],
    })

    expect(detail?.bio).toBe('Drives roadmap decisions.')
    expect(detail?.avatarUrl).toBe('/fixtures/personas/persona-1.svg')
    expect(detail?.goals).toEqual([{ label: 'Reduce uncertainty', priority: 0 }])
    expect(detail?.frustrations).toEqual([{ label: 'Slow approvals', evidenceCount: 0 }])
    expect(detail?.sections).toEqual([
      { id: 'note-mindset-0', title: 'Mindset', body: 'Outcome oriented' },
    ])

    const filtered = filterPersonaList(
      {
        items: [detail!],
        total: 1,
        page: 1,
        pageSize: 50,
      },
      'alex',
    )

    expect(filtered.items).toHaveLength(1)
  })

  it('normalizes nested v2 profile payloads with rich fields', () => {
    const detail = normalizePersonaDetail({
      id: 'persona-v2',
      name: 'Markus Sommer',
      status: 'ready',
      profile: {
        name: 'Markus Sommer',
        headline: 'Architekt',
        bio: 'Plant nachhaltige Gebäude.',
        age: 38,
        location: 'Hamburg',
        traits: { Analytical: 0.8, Empathetic: '0.4' },
        interests: ['Holzbau', 'Skizzen'],
        values: ['Klarheit'],
        social_media_usage: ['LinkedIn'],
        pain_points: [{ label: 'Lange Freigaben', evidence_count: 3 }],
        goals: [{ label: 'Bessere Briefings', priority: 1 }],
        communication_style: {
          vocabulary: ['Wärmepumpe', 'Energie'],
          sentence_structure: 'Sachlich und präzise.',
          skepticism_level: 0.4,
        },
      },
      moodboard: {
        style_keywords: ['warm'],
        tiles: [{ id: 't1', image_url: '/fixtures/personas/visuals/tone-warm.svg', category: 'tone' }],
      },
    })

    expect(detail?.role).toBe('Architekt')
    expect(detail?.age).toBe('38')
    expect(detail?.traits).toEqual({ Analytical: 0.8, Empathetic: 0.4 })
    expect(detail?.interests).toEqual(['Holzbau', 'Skizzen'])
    expect(detail?.values).toEqual(['Klarheit'])
    expect(detail?.socialMediaUsage).toEqual(['LinkedIn'])
    expect(detail?.frustrations).toEqual([{ label: 'Lange Freigaben', evidenceCount: 3 }])
    expect(detail?.goals).toEqual([{ label: 'Bessere Briefings', priority: 1 }])
    expect(detail?.communicationStyle?.vocabulary).toEqual(['Wärmepumpe', 'Energie'])
    expect(detail?.visuals?.tiles[0]?.imageUrl).toBe('/fixtures/personas/visuals/tone-warm.svg')
  })

  it('provides local demo fixtures with list and detail lookup', () => {
    const list = demoPersonaList()
    expect(list.items.length).toBeGreaterThanOrEqual(3)
    expect(demoPersonaDetail(list.items[0]!.id)?.name).toBe(list.items[0]!.name)
    expect(demoPersonaDetail(list.items[0]!.id)?.traits).toBeTruthy()
    expect(demoPersonaDetail('missing-id')).toBeNull()
  })

  it('creates and patches personas in the fixture store', () => {
    const before = storePersonaList().total
    const created = storeCreatePersona({
      name: 'Taylor Reed',
      role: 'Analyst',
      goals: [{ label: 'Ship briefs', priority: 0 }],
    })
    expect(storePersonaList().total).toBe(before + 1)
    expect(storePersonaDetail(created.id)?.goals).toEqual([{ label: 'Ship briefs', priority: 0 }])
    const patched = storePatchPersona(created.id, { bio: 'Updated bio' })
    expect(patched?.bio).toBe('Updated bio')
  })

  it('replaces goals frustrations and channels via partial patch', () => {
    const created = storeCreatePersona({
      name: 'List Editor',
      role: 'PM',
      goals: [
        { label: 'A', priority: 0 },
        { label: 'B', priority: 1 },
      ],
      frustrations: [{ label: 'X', evidenceCount: 0 }],
      channels: ['Slack'],
    })
    const goalsOnly = storePatchPersona(created.id, { goals: [{ label: 'C', priority: 0 }] })
    expect(goalsOnly?.goals).toEqual([{ label: 'C', priority: 0 }])
    expect(goalsOnly?.frustrations).toEqual([{ label: 'X', evidenceCount: 0 }])
    expect(goalsOnly?.channels).toEqual(['Slack'])

    const cleared = storePatchPersona(created.id, { frustrations: [], channels: ['Email', 'Zoom'] })
    expect(cleared?.frustrations).toEqual([])
    expect(cleared?.channels).toEqual(['Email', 'Zoom'])
    expect(cleared?.goals).toEqual([{ label: 'C', priority: 0 }])
  })

  it('coerces string goal arrays from legacy write payloads', () => {
    const created = storeCreatePersona({
      name: 'Legacy Writer',
      role: 'PM',
      // @ts-expect-error legacy string array still accepted via coerce
      goals: ['One', 'Two'],
    })
    expect(created.goals).toEqual([
      { label: 'One', priority: 0 },
      { label: 'Two', priority: 1 },
    ])
  })

  it('patches traits via store', () => {
    const created = storeCreatePersona({
      name: 'Trait Editor',
      role: 'PM',
      traits: { Focus: 0.5 },
    })
    const patched = storePatchPersona(created.id, { traits: { Focus: 0.8, Empathy: 0.4 } })
    expect(patched?.traits).toEqual({ Focus: 0.8, Empathy: 0.4 })
  })

  it('patches magazine notes sections like project knowledge chapters', () => {
    const created = storeCreatePersona({ name: 'Notes Persona', role: 'Lead' })
    const patched = storePatchPersona(created.id, {
      sections: [
        { id: 'note-mindset', title: 'Mindset', body: '<p>Short loops</p>' },
        { title: 'Context', body: 'Works across teams' },
      ],
    })
    expect(patched?.sections).toEqual([
      { id: 'note-mindset', title: 'Mindset', body: '<p>Short loops</p>' },
      { id: 'note-context-1', title: 'Context', body: 'Works across teams' },
    ])
  })

  it('patches and clears avatarUrl on write', () => {
    const created = storeCreatePersona({
      name: 'Portrait Persona',
      role: 'Lead',
      avatarUrl: '/fixtures/personas/persona-alex-morgan.svg',
    })
    expect(created.avatarUrl).toBe('/fixtures/personas/persona-alex-morgan.svg')
    const patched = storePatchPersona(created.id, {
      avatarUrl: '/fixtures/personas/persona-samira-khan.svg',
    })
    expect(patched?.avatarUrl).toBe('/fixtures/personas/persona-samira-khan.svg')
    const cleared = storePatchPersona(created.id, { avatarUrl: null })
    expect(cleared?.avatarUrl).toBeNull()
  })
})

describe('target group contracts', () => {
  it('normalizes summary and detail with linked personas', () => {
    expect(
      normalizeTargetGroupSummary({
        id: 'tg-1',
        name: 'Leads',
        segment: 'SaaS',
        persona_count: 2,
        status: 'published',
      }),
    ).toMatchObject({
      id: 'tg-1',
      name: 'Leads',
      status: 'active',
      personaCount: 2,
    })

    const detail = normalizeTargetGroupDetail({
      id: 'tg-1',
      name: 'Leads',
      segment: 'SaaS',
      personas: [{ id: 'p1', name: 'Alex', job_title: 'PM', status: 'ready' }],
    })
    expect(detail?.linkedPersonas).toHaveLength(1)
    expect(detail?.linkedPersonas[0]?.role).toBe('PM')
  })

  it('filters target groups and mutates fixture store', () => {
    const list = storeTargetGroupList()
    expect(list.items.length).toBeGreaterThanOrEqual(2)
    expect(filterTargetGroupList(list, 'digital').items.length).toBeGreaterThanOrEqual(1)

    const created = storeCreateTargetGroup({
      name: 'New Segment',
      segment: 'Test',
      linkedPersonaIds: ['persona-alex-morgan'],
    })
    expect(created.linkedPersonas[0]?.id).toBe('persona-alex-morgan')
    const patched = storePatchTargetGroup(created.id, { description: 'Hello' })
    expect(patched?.description).toBe('Hello')
    expect(storeTargetGroupDetail(created.id)?.description).toBe('Hello')
  })

  it('resolves target group for a linked persona', () => {
    expect(storeTargetGroupForPersona('persona-alex-morgan')?.name).toBe('Digital Product Leads')
    expect(storeTargetGroupForPersona('persona-jonas-richter')?.name).toBe('Brand Narrative Owners')
    expect(storeTargetGroupForPersona('missing-persona')).toBeNull()
  })
})

describe('journey contracts', () => {
  it('normalizes summary and detail phases from snake_case', () => {
    expect(
      normalizeJourneySummary({
        id: 'j1',
        name: 'Discovery',
        journey_type: 'awareness',
        phase_count: 3,
        target_group_id: 'tg-1',
        target_group_name: 'Leads',
        status: 'active',
      }),
    ).toMatchObject({
      id: 'j1',
      name: 'Discovery',
      journeyType: 'awareness',
      phaseCount: 3,
      targetGroupId: 'tg-1',
      targetGroupName: 'Leads',
    })

    const detail = normalizeJourneyDetail({
      id: 'j1',
      name: 'Discovery',
      journey_type: 'awareness',
      phases: [
        {
          id: 'ph1',
          name: 'Intake',
          order: 0,
          elements: [{ id: 'e1', kind: 'action', label: 'Note', order: 0 }],
        },
      ],
    })
    expect(detail?.phases).toHaveLength(1)
    expect(detail?.phases[0]?.elements[0]?.label).toBe('Note')
    expect(detail?.phaseCount).toBe(1)
  })

  it('filters journeys and mutates fixture store', () => {
    const list = storeJourneyList()
    expect(list.items.length).toBeGreaterThanOrEqual(2)
    expect(filterJourneyList(list, 'discovery').items.length).toBeGreaterThanOrEqual(1)

    const created = storeCreateJourney({
      name: 'New Map',
      journeyType: 'purchase',
      targetGroupId: 'tg-digital-product-leads',
    })
    expect(created.targetGroupName).toBe('Digital Product Leads')
    expect(created.phases).toEqual([])
    const patched = storePatchJourney(created.id, { description: 'Hello journey' })
    expect(patched?.description).toBe('Hello journey')
    expect(storeJourneyDetail(created.id)?.description).toBe('Hello journey')

    const withPhase = storePatchJourney(created.id, {
      phases: [
        {
          id: 'ph-new',
          name: 'First stop',
          order: 0,
          summary: 'Begin here',
          elements: [{ id: 'el-x', kind: 'action', label: 'Say hi', order: 0 }],
        },
      ],
    })
    expect(withPhase?.phases).toHaveLength(1)
    expect(withPhase?.phaseCount).toBe(1)
    expect(withPhase?.phases[0]?.name).toBe('First stop')

    expect(storeDeleteJourney(created.id)).toBe(true)
    expect(storeJourneyDetail(created.id)).toBeNull()
    expect(storeDeleteJourney(created.id)).toBe(false)
  })
})
