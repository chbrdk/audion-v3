/**
 * Push local Audion project.members[] into Plexon Collection assignments (additive).
 * Never overwrites or deletes existing Plexon assignments.
 * Spec: knowledge/collection-team-plexon.md
 */

import type { ProjectMember } from '@audion-v3/contracts'
import {
  addCollectionMemberOnPlexon,
  type CollectionMemberDto,
} from './collection-members-plexon'
import { storeProjectDetail } from './fixtures/project-store'
import { isRealPlatformProjectId } from './plexon-platform-id'
import { isPlexonAuthConfigured } from './runtime-config'

export type MemberMigrateResult =
  | 'migrated'
  | 'already_member'
  | 'user_not_found'
  | 'wrong_company'
  | 'skipped'
  | 'failed'

export type SyncCollectionMembersResult = {
  ok: boolean
  platformProjectId: string | null
  results: Array<{ email: string; result: MemberMigrateResult; detail?: string }>
}

function mapRole(role: string): 'admin' | 'member' {
  return role === 'owner' || role === 'admin' ? 'admin' : 'member'
}

export async function syncLocalMembersToPlexon(input: {
  projectId: string
  plexonUserId: string
}): Promise<SyncCollectionMembersResult> {
  const project = await storeProjectDetail(input.projectId)
  if (!project) {
    return { ok: false, platformProjectId: null, results: [] }
  }
  const platformProjectId = project.platformProjectId ?? null
  if (!isRealPlatformProjectId(platformProjectId) || !isPlexonAuthConfigured()) {
    return {
      ok: true,
      platformProjectId,
      results: [{ email: '*', result: 'skipped', detail: 'federation_off_or_unbound' }],
    }
  }

  const active = project.members.filter((m) => m.status !== 'removed' && m.email?.trim())
  const results: SyncCollectionMembersResult['results'] = []

  for (const member of active) {
    const email = member.email.trim()
    const added = await addCollectionMemberOnPlexon({
      platformProjectId: platformProjectId!,
      plexonUserId: input.plexonUserId,
      email,
      role: mapRole(member.role),
    })
    if (added.ok) {
      results.push({
        email,
        result: added.status === 'already_member' ? 'already_member' : 'migrated',
      })
      continue
    }
    if (added.error === 'user_not_found' || added.status === 404) {
      results.push({ email, result: 'user_not_found', detail: added.error })
      continue
    }
    if (added.error === 'wrong_company' || added.status === 403) {
      results.push({ email, result: 'wrong_company', detail: added.error })
      continue
    }
    results.push({ email, result: 'failed', detail: added.error })
  }

  return { ok: true, platformProjectId, results }
}

/** Merge Plexon roster + residual local members (invited / unknown email) for UI. */
export function mergeTeamDisplay(input: {
  plexonMembers: CollectionMemberDto[] | null
  localMembers: ProjectMember[]
}): Array<{
  id: string
  email: string
  role: string
  status: string
  source: 'plexon' | 'local'
}> {
  const rows: Array<{
    id: string
    email: string
    role: string
    status: string
    source: 'plexon' | 'local'
  }> = []
  const emails = new Set<string>()

  for (const m of input.plexonMembers ?? []) {
    const email = m.email.trim().toLowerCase()
    emails.add(email)
    rows.push({
      id: m.userId,
      email: m.email,
      role: m.role,
      status: m.source === 'creator' ? 'owner' : 'active',
      source: 'plexon',
    })
  }

  for (const m of input.localMembers.filter((x) => x.status !== 'removed')) {
    const email = m.email.trim().toLowerCase()
    if (emails.has(email)) continue
    rows.push({
      id: m.id,
      email: m.email,
      role: m.role,
      status: m.status,
      source: 'local',
    })
  }

  return rows
}
