import { NextResponse } from 'next/server'
import type { ProjectWritePayload } from '@audion-v3/contracts'
import { auth } from '../../../auth'
import {
  storeApplyPlatformBinding,
  storeCreateProject,
} from '../../../lib/fixtures/project-store'
import { getPlexonProfile } from '../../../lib/plexon-auth'
import { registerAudionProjectOnPlexon } from '../../../lib/plexon-project-origin'
import { isPlexonAuthConfigured } from '../../../lib/runtime-config'

export async function POST(request: Request) {
  const body = (await request.json()) as ProjectWritePayload
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const session = await auth()
  const ownerEmail = session?.user?.email || undefined
  const ownerPlexonUserId = session?.user?.id || null

  let platformCompanyId: string | null = null
  if (ownerPlexonUserId && isPlexonAuthConfigured()) {
    const profile = await getPlexonProfile(ownerPlexonUserId)
    platformCompanyId = profile?.default_platform_company_id ?? null
  }

  let project = storeCreateProject(body, {
    ownerEmail,
    ownerPlexonUserId,
    platformCompanyId,
  })

  if (ownerPlexonUserId && platformCompanyId && isPlexonAuthConfigured()) {
    const origin = await registerAudionProjectOnPlexon({
      audionProjectId: project.id,
      name: project.name,
      ownerPlexonUserId,
      platformCompanyId,
    })
    if (origin?.platformProjectId) {
      project =
        storeApplyPlatformBinding(project.id, {
          platformProjectId: origin.platformProjectId,
          platformCompanyId: origin.platformCompanyId ?? platformCompanyId,
          ownerPlexonUserId,
        }) ?? project
    }
  }

  return NextResponse.json(project, { status: 201 })
}
