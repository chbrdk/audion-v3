import { afterEach, describe, expect, it } from 'vitest'
import {
  resetResearchRuns,
  storeCreateResearchRun,
  storeResearchLatest,
  storeResearchSseChunks,
  storeResearchStatus,
} from '../lib/fixtures/research-runs'
import { createKnowledgeEntry, updateKnowledgeEntry } from '../lib/knowledge-entries'
import {
  hasPersonaProfileDe,
  resolvePersonaBio,
  resolvePersonaHeadline,
} from '../lib/persona-profile-de'
import {
  resetTargetGroupStore,
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from '../lib/fixtures/target-group-store'
import {
  resetPersonaStore,
  storePatchPersona,
  storePersonaDetail,
} from '../lib/fixtures/persona-store'

afterEach(() => {
  resetResearchRuns()
  resetTargetGroupStore()
  resetPersonaStore()
})

describe('research run fixture progression', () => {
  it('moves queued → running → succeeded and exposes latest summary', () => {
    const runId = storeCreateResearchRun(
      'proj-audion-core',
      'https://example.com',
      true,
      Date.now() - 5000,
    )
    const status = storeResearchStatus('proj-audion-core', runId)
    expect(status).toHaveProperty('events')
    if (!('events' in status)) return
    expect(status.status).toBe('succeeded')
    expect(status.events.some((e) => e.eventType === 'summary_saved')).toBe(true)

    const latest = storeResearchLatest('proj-audion-core')
    expect(latest.status).toBe('succeeded')
    expect(latest.summaryEn?.length).toBeGreaterThan(0)
    expect(latest.summaryEn?.[0]?.claims[0]?.text).toContain('example.com')
  })

  it('emits SSE progress chunks then done', () => {
    const runId = storeCreateResearchRun(
      'proj-audion-core',
      'https://seed.test',
      true,
      Date.now() - 5000,
    )
    const chunks = storeResearchSseChunks('proj-audion-core', runId)
    expect(chunks.some((c) => c.includes('event: progress'))).toBe(true)
    expect(chunks.some((c) => c.includes('event: done'))).toBe(true)
  })
})

describe('knowledge entry helpers + stores', () => {
  it('creates and updates knowledge entries on a target group', () => {
    const tg = storeTargetGroupDetail('tg-digital-product-leads')
    expect(tg?.knowledgeEntries.length).toBeGreaterThan(0)
    const created = createKnowledgeEntry({ title: 'New', content: '<p>Body</p>' })
    storePatchTargetGroup('tg-digital-product-leads', {
      name: tg!.name,
      segment: tg!.segment,
      knowledgeEntries: [...tg!.knowledgeEntries, created],
    })
    const after = storeTargetGroupDetail('tg-digital-product-leads')
    expect(after?.knowledgeEntries.some((e) => e.id === created.id)).toBe(true)
    expect(after?.documents[0]?.status).toBe('ready')

    const updated = updateKnowledgeEntry(created, { title: 'Updated', content: '<p>Next</p>' })
    expect(updated.title).toBe('Updated')
    expect(updated.updatedAt).toBeTruthy()
  })

  it('patches persona knowledge and profileDe', () => {
    const persona = storePersonaDetail('persona-alex-morgan')
    expect(persona?.profileDe?.bio).toBeTruthy()
    expect(persona?.knowledgeEntries.length).toBeGreaterThan(0)

    const entry = createKnowledgeEntry({ title: 'Extra', content: '<p>Note</p>' })
    storePatchPersona('persona-alex-morgan', {
      name: persona!.name,
      role: persona!.role,
      knowledgeEntries: [...persona!.knowledgeEntries, entry],
      headlineDe: 'Product Lead · DE',
    })
    const next = storePersonaDetail('persona-alex-morgan')
    expect(next?.knowledgeEntries.some((e) => e.title === 'Extra')).toBe(true)
    expect(next?.headlineDe).toBe('Product Lead · DE')
  })
})

describe('persona profile_de locale helpers', () => {
  it('prefers DE headline/bio when locale is German', () => {
    const persona = storePersonaDetail('persona-alex-morgan')!
    expect(resolvePersonaHeadline(persona, 'de')).toContain('Evidenz')
    expect(resolvePersonaBio(persona, 'de')).toContain('Product Lead')
    expect(resolvePersonaHeadline(persona, 'en')).toBe(persona.role)
    expect(resolvePersonaBio(persona, 'en')).toBe(persona.bio)
    expect(hasPersonaProfileDe(persona.profileDe)).toBe(true)
    expect(hasPersonaProfileDe(null)).toBe(false)
  })
})
