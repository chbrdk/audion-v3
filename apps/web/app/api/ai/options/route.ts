import { NextResponse } from 'next/server'
import { storeProjectList } from '../../../../lib/fixtures/project-store'
import { storeTargetGroupList } from '../../../../lib/fixtures/target-group-store'

/** Lightweight picker options for AI dialogs (fixture-backed Wave 1). */
export async function GET() {
  const projects = await storeProjectList()
  const targetGroups = await storeTargetGroupList()
  return NextResponse.json({
    projects: projects.items.map((p) => ({ id: p.id, name: p.name })),
    targetGroups: targetGroups.items.map((g) => ({
      id: g.id,
      name: g.name,
      segment: g.segment,
      projectId: g.projectId,
    })),
  })
}
