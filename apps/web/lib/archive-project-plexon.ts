/**
 * Archive (or restore) a Collection via Plexon product BFF lifecycle.
 * Service secret + X-Plexon-User-Id — same auth style as accessible-collections.
 */

import { getPlexonContractHeaders } from './plexon-contract'
import { isRealPlatformProjectId } from './plexon-platform-id'
import { paths } from './paths'
import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'

export type LifecycleStatus = 'active' | 'archived'

export type ArchiveOnPlexonResult =
  | { ok: true; skipped: true; reason: 'not_bound' | 'federation_off' }
  | { ok: true; skipped: false }
  | { ok: false; status: number; detail: string }

export async function setCollectionLifecycleOnPlexon(input: {
  platformProjectId: string | null | undefined
  plexonUserId: string
  status: LifecycleStatus
}): Promise<ArchiveOnPlexonResult> {
  if (!isRealPlatformProjectId(input.platformProjectId)) {
    return { ok: true, skipped: true, reason: 'not_bound' }
  }
  if (!isPlexonAuthConfigured()) {
    return { ok: true, skipped: true, reason: 'federation_off' }
  }

  const base = getPlexonAuthUrl().replace(/\/$/, '')
  const secret = getPlexonServiceSecret()
  const url = `${base}${paths.plexonProvisioningProjectPath(input.platformProjectId!)}`

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Plexon-User-Id': input.plexonUserId,
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify({ status: input.status }),
      cache: 'no-store',
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, status: res.status, detail: detail || `HTTP ${res.status}` }
    }
    return { ok: true, skipped: false }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    return { ok: false, status: 502, detail }
  }
}
