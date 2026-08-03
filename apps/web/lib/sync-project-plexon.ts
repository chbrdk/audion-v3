/**
 * Register an existing AUDION project on Plexon (Collection + CHECKION mirror).
 * Owner/company optional — Plexon auto-resolves when omitted.
 * After bind (or re-sync when already bound), schedules Knowledge Pack autosync.
 */

import { auth } from '../auth'
import {
  storeApplyPlatformBinding,
  storeProjectDetail,
} from './fixtures/project-store'
import { scheduleResearchBriefAutosync } from './knowledge-pack-autosync'
import { getPlexonProfile } from './plexon-auth'
import { registerAudionProjectOnPlexonDetailed } from './plexon-project-origin'
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
      /** Soft knowledge-pack publish was scheduled after bind / re-sync. */
      knowledgeAutosyncScheduled: boolean
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
    // Late-bind / re-sync: push local dossier + research distillate into Collection pack.
    scheduleResearchBriefAutosync(projectId)
    return {
      ok: true,
      projectId: project.id,
      platformProjectId: project.platformProjectId,
      checkionProjectId: project.checkionProjectId ?? null,
      platformCompanyId: project.platformCompanyId ?? null,
      alreadyBound: true,
      knowledgeAutosyncScheduled: true,
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

  const origin = await registerAudionProjectOnPlexonDetailed({
    audionProjectId: project.id,
    name: project.name,
    domain: input.domain?.trim() || null,
    ownerPlexonUserId: ownerPlexonUserId || null,
    platformCompanyId: platformCompanyId || null,
  })

  if (!origin || !('platformProjectId' in origin)) {
    return {
      ok: false,
      status: origin && 'status' in origin ? origin.status : 502,
      error: 'plexon_origin_failed',
      detail:
        origin && 'detail' in origin
          ? origin.detail
          : 'Plexon audion-project-origin did not return platformProjectId',
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

  scheduleResearchBriefAutosync(bound.id)

  return {
    ok: true,
    projectId: bound.id,
    platformProjectId: bound.platformProjectId!,
    checkionProjectId: bound.checkionProjectId ?? null,
    platformCompanyId: bound.platformCompanyId ?? null,
    alreadyBound: false,
    knowledgeAutosyncScheduled: true,
  }
}
