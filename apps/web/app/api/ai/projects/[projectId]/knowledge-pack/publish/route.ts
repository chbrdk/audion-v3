import { NextResponse } from 'next/server'
import { publishProjectResearchBrief } from '../../../../../../../lib/knowledge-pack-autosync'

export const runtime = 'nodejs'

type Params = { params: Promise<{ projectId: string }> }

/**
 * POST /api/ai/projects/:projectId/knowledge-pack/publish
 * Distill local dossier + latest research into Collection research_brief.
 */
export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params
  const body = (await request.json().catch(() => ({}))) as {
    chapterIds?: string[]
  }

  const published = await publishProjectResearchBrief({
    projectId,
    chapterIds: body.chapterIds,
  })

  if (!published.ok) {
    return NextResponse.json(
      {
        error: published.error,
        detail: published.detail,
      },
      { status: published.status },
    )
  }

  return NextResponse.json({
    success: true,
    platformProjectId: published.platformProjectId,
    revision: published.revision,
    sectionsPublished: published.sectionsPublished,
  })
}
