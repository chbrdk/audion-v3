import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  distillResearchBrief,
  formatPackSeedContext,
  type KnowledgePackResponse,
} from '../lib/plexon-knowledge-pack'
import { paths } from '../lib/paths'

describe('audion knowledge pack distill + seed', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('formats pack seed context from facets', () => {
    const pack: KnowledgePackResponse = {
      platformProjectId: 'pp-1',
      revision: 1,
      facets: {
        profile: { data: { displayName: 'Acme', industry: 'SaaS' } },
        competitive: {
          data: { competitors: [{ host: 'rival.com' }], category: 'DevTools' },
        },
        geo_context: {
          data: { queryThemes: ['alternatives'], seedQueries: ['Best Acme tools'] },
        },
        research_brief: {
          data: {
            summary: 'Acme leads mid-market',
            topics: ['Pricing', 'Trust'],
            sections: [{ title: 'Buyers', plainText: 'Ops leads evaluate onboarding speed.' }],
          },
        },
      },
    }
    const text = formatPackSeedContext(pack)
    expect(text).toContain('Acme')
    expect(text).toContain('rival.com')
    expect(text).toContain('Best Acme tools')
    expect(text).toContain('Acme leads mid-market')
    expect(text).toContain('Pricing')
    expect(text).toContain('Ops leads evaluate')
  })

  it('distills chapters to plain sections without HTML', () => {
    const distilled = distillResearchBrief({
      chapters: [
        { id: 'c1', title: 'Market', body: '<p>Hello <strong>world</strong></p>' },
        { id: 'c2', title: 'Empty', body: '<p>  </p>' },
      ],
      summarySections: [
        {
          key: 'overview',
          title: 'Overview',
          claims: [{ text: 'Acme leads category', citations: [] }],
        },
      ],
      sourceRunId: 'run-1',
      sourceProjectId: 'proj-1',
    })
    expect(distilled.sections).toHaveLength(1)
    expect(distilled.sections[0]?.plainText).toBe('Hello world')
    expect(distilled.summary).toContain('Acme leads category')
    expect(distilled.sourceRunId).toBe('run-1')
    expect(distilled.topics).toContain('Overview')
  })

  it('exposes publish route helper', () => {
    expect(paths.routes.apiAiKnowledgePackPublish('proj-1')).toBe(
      '/api/ai/projects/proj-1/knowledge-pack/publish',
    )
  })
})
