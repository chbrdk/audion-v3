/**
 * Register an existing AUDION project on Plexon (Collection + CHECKION mirror).
 * Owner/company optional — Plexon auto-resolves when omitted.
 */

import { auth } from '../auth'
import {
  storeApplyPlatformBinding,
  storeProjectDetail,
} from './fixtures/project-store'
import { getPlexonProfile } from './plexon-auth'
import { registerAudionProjectOnPlexon } from './plexon-project-origin'
import { isPlexonAuthConfigured } from './runtime-config'

export type SyncProjectToPlexonInput = {
  ownerPlexonUserId?: string | null
  platformCompanyId?: string | null
  domain?: string | null
}

export type SyncProjectToPlexonResult =
  | {
      ok: true
      projectId: string
      platformProjectId: string
      checkionProjectId: string | null
      platformCompanyId: string | null
      alreadyBound: boolean
    }
  | { ok: false; status: number; error: string; detail?: string }

export async function syncProjectToPlexon(
  projectId: string,
  input: SyncProjectToPlexonInput = {},
): Promise<SyncProjectToPlexonResult> {
  if (!isPlexonAuthConfigured()) {
    return { ok: false, status: 503, error: 'plexon_not_configured' }
  }

  const project = await storeProjectDetail(projectId)
  if (!project) {
    return { ok: false, status: 404, error: 'not_found', detail: 'Project not found' }
  }

  if (project.platformProjectId?.trim()) {
    return {
      ok: true,
      projectId: project.id,
      platformProjectId: project.platformProjectId,
      checkionProjectId: project.checkionProjectId ?? null,
      platformCompanyId: project.platformCompanyId ?? null,
      alreadyBound: true,
    }
  }

  const session = await auth()
  let ownerPlexonUserId =
    input.ownerPlexonUserId?.trim() ||
    session?.user?.id?.trim() ||
    project.ownerPlexonUserId?.trim() ||
    ''

  let platformCompanyId =
    input.platformCompanyId?.trim() || project.platformCompanyId?.trim() || ''

  if (ownerPlexonUserId && !platformCompanyId) {
    const profile = await getPlexonProfile(ownerPlexonUserId)
    platformCompanyId = profile?.default_platform_company_id?.trim() || ''
  }

  const origin = await registerAudionProjectOnPlexon({
    audionProjectId: project.id,
    name: project.name,
    domain: input.domain?.trim() || null,
    ownerPlexonUserId: ownerPlexonUserId || null,
    platformCompanyId: platformCompanyId || null,
  })

  if (!origin?.platformProjectId) {
    return {
      ok: false,
      status: 502,
      error: 'plexon_origin_failed',
      detail: 'Plexon audion-project-origin did not return platformProjectId',
    }
  }

  const bound = await storeApplyPlatformBinding(project.id, {
    platformProjectId: origin.platformProjectId,
    checkionProjectId: origin.checkionProjectId ?? null,
    platformCompanyId: origin.platformCompanyId ?? (platformCompanyId || null),
    ownerPlexonUserId: origin.ownerPlexonUserId ?? (ownerPlexonUserId || null),
  })

  if (!bound) {
    return { ok: false, status: 500, error: 'binding_persist_failed' }
  }

  return {
    ok: true,
    projectId: bound.id,
    platformProjectId: bound.platformProjectId!,
    checkionProjectId: bound.checkionProjectId ?? null,
    platformCompanyId: bound.platformCompanyId ?? null,
    alreadyBound: false,
  }
}
