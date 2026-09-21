/**
 * Call Plexon Collection members / invites APIs from AUDION BFF.
 * Spec: plexon-v3/specs/api/collection-members.md · collection-invites.md
 */

import { getPlexonContractHeaders } from './plexon-contract'
import { isRealPlatformProjectId } from './plexon-platform-id'
import { paths } from './paths'
import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'

export type CollectionMemberDto = {
  userId: string
  email: string
  name: string | null
  role: 'admin' | 'member'
  source: 'creator' | 'assignment'
}

function plexonHeaders(plexonUserId: string): HeadersInit {
  return {
    'X-Plexon-User-Id': plexonUserId,
    ...getPlexonContractHeaders(getPlexonServiceSecret()),
  }
}

export async function fetchCollectionMembersFromPlexon(input: {
  platformProjectId: string
  plexonUserId: string
}): Promise<
  | { ok: true; items: CollectionMemberDto[] }
  | { ok: false; status: number; error: string }
> {
  if (!isRealPlatformProjectId(input.platformProjectId) || !isPlexonAuthConfigured()) {
    return { ok: false, status: 503, error: 'federation_off' }
  }
  const base = getPlexonAuthUrl().replace(/\/$/, '')
  const url = `${base}${paths.plexonProvisioningCollectionMembersPath(input.platformProjectId)}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: plexonHeaders(input.plexonUserId),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as {
      items?: CollectionMemberDto[]
      error?: string
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data.error === 'string' ? data.error : 'members_list_failed',
      }
    }
    return { ok: true, items: Array.isArray(data.items) ? data.items : [] }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'members_unreachable',
    }
  }
}

export async function addCollectionMemberOnPlexon(input: {
  platformProjectId: string
  plexonUserId: string
  email: string
  role?: 'admin' | 'member'
}): Promise<
  | {
      ok: true
      status: 'added' | 'already_member'
      userId: string
      email: string
      role: string
    }
  | { ok: false; status: number; error: string }
> {
  if (!isRealPlatformProjectId(input.platformProjectId) || !isPlexonAuthConfigured()) {
    return { ok: false, status: 503, error: 'federation_off' }
  }
  const base = getPlexonAuthUrl().replace(/\/$/, '')
  const url = `${base}${paths.plexonProvisioningCollectionMembersPath(input.platformProjectId)}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...plexonHeaders(input.plexonUserId),
      },
      body: JSON.stringify({ email: input.email, role: input.role ?? 'member' }),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data.error === 'string' ? data.error : 'member_add_failed',
      }
    }
    return {
      ok: true,
      status: data.status === 'already_member' ? 'already_member' : 'added',
      userId: String(data.userId ?? ''),
      email: String(data.email ?? input.email),
      role: String(data.role ?? 'member'),
    }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'member_unreachable',
    }
  }
}

export async function revokeCollectionMemberOnPlexon(input: {
  platformProjectId: string
  plexonUserId: string
  memberUserId: string
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!isRealPlatformProjectId(input.platformProjectId) || !isPlexonAuthConfigured()) {
    return { ok: false, status: 503, error: 'federation_off' }
  }
  const base = getPlexonAuthUrl().replace(/\/$/, '')
  const url = `${base}${paths.plexonProvisioningCollectionMemberPath(
    input.platformProjectId,
    input.memberUserId,
  )}`
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: plexonHeaders(input.plexonUserId),
      cache: 'no-store',
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      return {
        ok: false,
        status: res.status,
        error: typeof data.error === 'string' ? data.error : 'member_revoke_failed',
      }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'member_unreachable',
    }
  }
}

export async function createCollectionInviteOnPlexon(input: {
  platformProjectId: string
  plexonUserId: string
  role?: 'admin' | 'member'
  toEmail?: string
}): Promise<
  | { ok: true; inviteUrl: string; inviteId: string; expiresAt?: string; emailedTo?: string }
  | { ok: false; status: number; error: string }
> {
  if (!isRealPlatformProjectId(input.platformProjectId) || !isPlexonAuthConfigured()) {
    return { ok: false, status: 503, error: 'federation_off' }
  }
  const base = getPlexonAuthUrl().replace(/\/$/, '')
  const url = `${base}${paths.plexonProvisioningCollectionInvitesPath(input.platformProjectId)}`
  const body: Record<string, unknown> = { role: input.role ?? 'member' }
  const toEmail = input.toEmail?.trim()
  if (toEmail) body.toEmail = toEmail
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...plexonHeaders(input.plexonUserId),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data.error === 'string' ? data.error : 'invite_failed',
      }
    }
    return {
      ok: true,
      inviteUrl: String(data.inviteUrl ?? ''),
      inviteId: String(data.inviteId ?? ''),
      expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
      emailedTo: typeof data.emailedTo === 'string' ? data.emailedTo : undefined,
    }
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'invite_unreachable',
    }
  }
}
