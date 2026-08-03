import { NextResponse } from 'next/server'
import { applyLatestResearchToProjectKnowledge } from '../../../../../../../lib/research-to-knowledge'

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params
  const result = await applyLatestResearchToProjectKnowledge(projectId)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({
    ok: true,
    chaptersAdded: result.chaptersAdded,
    chapterIds: result.chapterIds,
    project: result.project,
  })
}
