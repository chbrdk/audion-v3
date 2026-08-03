/**
 * Merge latest research summary into project knowledge chapters.
 * Spec twin: knowledge/project-research-sse-2026.md
 */

import type {
  ProjectDetail,
  ProjectKnowledgeChapter,
  ResearchSummarySection,
} from '@audion-v3/contracts'
import { storePatchProject, storeProjectDetail } from './fixtures/project-store'
import { storeResearchLatest } from './fixtures/research-runs'
import {
  newKnowledgeChapterId,
  resolveKnowledgeChapters,
  sanitizeKnowledgeHtml,
  toKnowledgeHtml,
} from './project-knowledge'

export const RESEARCH_CHAPTER_ID_PREFIX = 'ch-research-'

export type ApplyResearchKnowledgeResult =
  | {
      ok: true
      project: ProjectDetail
      chaptersAdded: number
      chapterIds: string[]
    }
  | { ok: false; status: number; error: string }

export function researchSectionToChapter(
  section: ResearchSummarySection,
  index: number,
): ProjectKnowledgeChapter {
  const key = (section.key || `section_${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_')
  const claims = section.claims.map((c) => c.text.trim()).filter(Boolean)
  const body = sanitizeKnowledgeHtml(
    toKnowledgeHtml(claims.join('\n\n') || 'No claims in this research section.'),
  )
  return {
    id: `${RESEARCH_CHAPTER_ID_PREFIX}${key}`,
    title: (section.title || `Research ${index + 1}`).trim().slice(0, 120),
    body,
  }
}

export function mergeResearchChaptersIntoKnowledge(
  existing: ProjectKnowledgeChapter[],
  researchChapters: ProjectKnowledgeChapter[],
): ProjectKnowledgeChapter[] {
  const kept = existing.filter((c) => !c.id.startsWith(RESEARCH_CHAPTER_ID_PREFIX))
  return [...kept, ...researchChapters]
}

/**
 * Apply latest succeeded research summary onto project knowledge dossier.
 * Replaces previous `ch-research-*` chapters so re-apply is idempotent.
 */
export async function applyLatestResearchToProjectKnowledge(
  projectId: string,
): Promise<ApplyResearchKnowledgeResult> {
  const project = await storeProjectDetail(projectId)
  if (!project) {
    return { ok: false, status: 404, error: 'Project not found' }
  }

  const latest = storeResearchLatest(projectId)
  if (latest.status !== 'succeeded' || !latest.summaryEn?.length) {
    return {
      ok: false,
      status: 422,
      error: 'No succeeded research summary to apply',
    }
  }

  const researchChapters = latest.summaryEn.map((section, index) =>
    researchSectionToChapter(section, index),
  )
  // Ensure unique ids if keys collide
  const seen = new Set<string>()
  for (const ch of researchChapters) {
    if (seen.has(ch.id)) {
      ch.id = `${ch.id}-${newKnowledgeChapterId()}`
    }
    seen.add(ch.id)
  }

  const existing = resolveKnowledgeChapters(project.knowledgeChapters, project.companyContext)
  const knowledgeChapters = mergeResearchChaptersIntoKnowledge(existing, researchChapters)
  const patched = await storePatchProject(projectId, { knowledgeChapters })
  if (!patched) {
    return { ok: false, status: 500, error: 'Failed to update project knowledge' }
  }

  return {
    ok: true,
    project: patched,
    chaptersAdded: researchChapters.length,
    chapterIds: researchChapters.map((c) => c.id),
  }
}
