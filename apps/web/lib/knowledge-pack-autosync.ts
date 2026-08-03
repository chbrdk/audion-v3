/**
 * Distill + publish Collection research_brief (manual CTA + post-research autosync).
 */

import { storeProjectDetail } from './fixtures/project-store'
import { storeResearchLatest } from './fixtures/research-runs'
import {
  distillResearchBrief,
  fetchCollectionKnowledgePack,
  publishResearchBriefToPack,
} from './plexon-knowledge-pack'
import { resolveKnowledgeChapters } from './project-knowledge'
import { isPlexonAuthConfigured } from './runtime-config'

export type KnowledgePackPublishResult =
  | {
      ok: true
      platformProjectId: string
      revision: number
      sectionsPublished: number
      skipped?: never
    }
  | {
      ok: false
      status: number
      error: string
      detail?: string
      skipped?: boolean
    }

function autosyncDisabled(): boolean {
  const raw = process.env.KNOWLEDGE_PACK_AUTOSYNC?.trim().toLowerCase()
  return raw === '0' || raw === 'false' || raw === 'off'
}

/**
 * Publish distillate for a project. Returns skipped/soft failures for autosync callers.
 */
export async function publishProjectResearchBrief(opts: {
  projectId: string
  chapterIds?: string[]
  /** When true, missing Collection / empty distillate / plexon down → soft skip (no throw). */
  soft?: boolean
}): Promise<KnowledgePackPublishResult> {
  const soft = Boolean(opts.soft)

  if (!isPlexonAuthConfigured()) {
    return soft
      ? { ok: false, status: 503, error: 'plexon_not_configured', skipped: true }
      : { ok: false, status: 503, error: 'plexon_not_configured' }
  }

  const project = await storeProjectDetail(opts.projectId)
  if (!project) {
    return { ok: false, status: 404, error: 'not_found', detail: 'Project not found' }
  }

  const platformProjectId = project.platformProjectId?.trim()
  if (!platformProjectId) {
    return soft
      ? { ok: false, status: 422, error: 'no_collection', skipped: true }
      : {
          ok: false,
          status: 422,
          error: 'no_collection',
          detail: 'Project is not bound to a Plexon Collection',
        }
  }

  const chapters = resolveKnowledgeChapters(
    project.knowledgeChapters,
    project.companyContext,
  ).filter((c) => {
    if (!Array.isArray(opts.chapterIds) || opts.chapterIds.length === 0) return true
    return opts.chapterIds.includes(c.id)
  })

  const latest = storeResearchLatest(opts.projectId)
  const data = distillResearchBrief({
    chapters,
    summarySections: latest.status === 'succeeded' ? latest.summaryEn : null,
    sourceRunId: latest.status === 'succeeded' ? latest.runId : null,
    sourceProjectId: opts.projectId,
  })

  if (!data.summary && data.sections.length === 0) {
    return soft
      ? { ok: false, status: 422, error: 'empty_distillate', skipped: true }
      : {
          ok: false,
          status: 422,
          error: 'empty_distillate',
          detail: 'No research summary or knowledge chapters to publish',
        }
  }

  const pack = await fetchCollectionKnowledgePack(platformProjectId)
  if (!pack) {
    return soft
      ? { ok: false, status: 502, error: 'pack_unavailable', skipped: true }
      : {
          ok: false,
          status: 502,
          error: 'pack_unavailable',
          detail: 'Could not load Collection knowledge pack',
        }
  }

  const published = await publishResearchBriefToPack({
    platformProjectId,
    expectedRevision: pack.revision,
    data,
    runId: data.sourceRunId,
  })
  if (!published.ok) {
    return {
      ok: false,
      status: published.status >= 400 ? published.status : 502,
      error: 'publish_failed',
      detail: published.error,
      skipped: soft,
    }
  }

  return {
    ok: true,
    platformProjectId,
    revision: published.revision,
    sectionsPublished: data.sections.length,
  }
}

/** Fire-and-forget after successful research (no-op when unbound / disabled / plexon down). */
export function scheduleResearchBriefAutosync(projectId: string): void {
  if (autosyncDisabled()) return
  void publishProjectResearchBrief({ projectId, soft: true }).then((result) => {
    if (result.ok) {
      console.info(
        '[AUDION-v3] knowledge autosync ok',
        projectId,
        `rev=${result.revision}`,
      )
      return
    }
    if (result.skipped) return
    console.warn(
      '[AUDION-v3] knowledge autosync failed',
      projectId,
      result.error,
      result.detail ?? '',
    )
  })
}
