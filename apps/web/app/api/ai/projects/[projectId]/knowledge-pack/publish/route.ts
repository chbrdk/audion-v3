import { NextResponse } from 'next/server'
import { storeProjectDetail } from '../../../../../../../lib/fixtures/project-store'
import { storeResearchLatest } from '../../../../../../../lib/fixtures/research-runs'
import {
  distillResearchBrief,
  fetchCollectionKnowledgePack,
  publishResearchBriefToPack,
} from '../../../../../../../lib/plexon-knowledge-pack'
import { resolveKnowledgeChapters } from '../../../../../../../lib/project-knowledge'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

/**
 * POST /api/ai/projects/:projectId/knowledge-pack/publish
 * Distill local dossier + latest research into Collection research_brief.
 */
export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const project = await storeProjectDetail(projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const platformProjectId = project.platformProjectId?.trim()
  if (!platformProjectId) {
    return NextResponse.json(
      {
        error: 'no_collection',
        detail: 'Project is not bound to a Plexon Collection',
      },
      { status: 422 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as {
    chapterIds?: string[]
  }

  const chapters = resolveKnowledgeChapters(
    project.knowledgeChapters,
    project.companyContext,
  ).filter((c) => {
    if (!Array.isArray(body.chapterIds) || body.chapterIds.length === 0) return true
    return body.chapterIds.includes(c.id)
  })

  const latest = storeResearchLatest(projectId)
  const data = distillResearchBrief({
    chapters,
    summarySections: latest.status === 'succeeded' ? latest.summaryEn : null,
    sourceRunId: latest.status === 'succeeded' ? latest.runId : null,
    sourceProjectId: projectId,
  })

  if (!data.summary && data.sections.length === 0) {
    return NextResponse.json(
      { error: 'empty_distillate', detail: 'No research summary or knowledge chapters to publish' },
      { status: 422 },
    )
  }

  const pack = await fetchCollectionKnowledgePack(platformProjectId)
  if (!pack) {
    return NextResponse.json(
      { error: 'pack_unavailable', detail: 'Could not load Collection knowledge pack' },
      { status: 502 },
    )
  }

  const published = await publishResearchBriefToPack({
    platformProjectId,
    expectedRevision: pack.revision,
    data,
    runId: data.sourceRunId,
  })
  if (!published.ok) {
    return NextResponse.json(
      { error: 'publish_failed', detail: published.error },
      { status: published.status >= 400 ? published.status : 502 },
    )
  }

  return NextResponse.json({
    success: true,
    platformProjectId,
    revision: published.revision,
    sectionsPublished: data.sections.length,
  })
}
