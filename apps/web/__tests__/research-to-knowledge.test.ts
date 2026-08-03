import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  applyLatestResearchToProjectKnowledge,
  mergeResearchChaptersIntoKnowledge,
  RESEARCH_CHAPTER_ID_PREFIX,
  researchSectionToChapter,
} from '../lib/research-to-knowledge'
import {
  resetProjectStore,
  storeCreateProject,
  storeProjectDetail,
} from '../lib/fixtures/project-store'
import {
  resetResearchRuns,
  storeCompleteResearchRun,
  storeCreateResearchRun,
  storeMarkResearchRunning,
} from '../lib/fixtures/research-runs'

vi.mock('../lib/knowledge-pack-autosync', () => ({
  scheduleResearchBriefAutosync: vi.fn(),
}))

describe('research to project knowledge', () => {
  afterEach(() => {
    resetResearchRuns()
    resetProjectStore()
    vi.clearAllMocks()
  })

  it('maps summary sections to ch-research-* chapters', () => {
    const chapter = researchSectionToChapter(
      {
        key: 'overview',
        title: 'Hub Line',
        claims: [{ text: 'Urban motor.', citations: ['https://example.com'] }],
      },
      0,
    )
    expect(chapter.id).toBe(`${RESEARCH_CHAPTER_ID_PREFIX}overview`)
    expect(chapter.title).toBe('Hub Line')
    expect(chapter.body).toMatch(/Urban motor/)
  })

  it('replaces previous research chapters on merge', () => {
    const merged = mergeResearchChaptersIntoKnowledge(
      [
        { id: 'ch-brand', title: 'Brand', body: '<p>Keep</p>' },
        { id: `${RESEARCH_CHAPTER_ID_PREFIX}old`, title: 'Old', body: '<p>Drop</p>' },
      ],
      [{ id: `${RESEARCH_CHAPTER_ID_PREFIX}new`, title: 'New', body: '<p>Fresh</p>' }],
    )
    expect(merged.map((c) => c.id)).toEqual(['ch-brand', `${RESEARCH_CHAPTER_ID_PREFIX}new`])
  })

  it('applies latest research onto project knowledge dossier and schedules pack sync', async () => {
    const { scheduleResearchBriefAutosync } = await import('../lib/knowledge-pack-autosync')
    const project = await storeCreateProject({
      name: 'Bosch eBike',
      knowledgeChapters: [{ id: 'ch-brand', title: 'Brand', body: '<p>Existing</p>' }],
    })
    const runId = storeCreateResearchRun(project.id, 'https://example.com', false)
    storeMarkResearchRunning(runId)
    storeCompleteResearchRun(runId, [
      {
        key: 'overview',
        title: 'Overview',
        claims: [{ text: 'Research claim A', citations: [] }],
      },
      {
        key: 'hub',
        title: 'Hub Line',
        claims: [{ text: 'Research claim B', citations: [] }],
      },
    ])

    const result = await applyLatestResearchToProjectKnowledge(project.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.chaptersAdded).toBe(2)
    expect(scheduleResearchBriefAutosync).toHaveBeenCalledWith(project.id)

    const detail = await storeProjectDetail(project.id)
    expect(detail?.knowledgeChapters.some((c) => c.id === 'ch-brand')).toBe(true)
    expect(
      detail?.knowledgeChapters.filter((c) => c.id.startsWith(RESEARCH_CHAPTER_ID_PREFIX)),
    ).toHaveLength(2)
    expect(detail?.knowledgeChapters.some((c) => c.body.includes('Research claim A'))).toBe(true)
  })
})
