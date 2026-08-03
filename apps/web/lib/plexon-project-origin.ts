import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'
import { getPlexonContractHeaders } from './plexon-contract'

export type AudionProjectOriginResult = {
  platformProjectId: string
  checkionProjectId?: string
  platformCompanyId?: string
  ownerPlexonUserId?: string
}

/**
 * Register an AUDION-origin project on the Plexon control plane.
 * Owner/company optional — Plexon auto-resolves when omitted (service secret).
 * Returns null when not configured or on failure (caller must not block create).
 */
export async function registerAudionProjectOnPlexon(params: {
  audionProjectId: string
  name: string
  domain?: string | null
  ownerPlexonUserId?: string | null
  platformCompanyId?: string | null
}): Promise<AudionProjectOriginResult | null> {
  if (!isPlexonAuthConfigured()) return null
  const base = getPlexonAuthUrl().replace(/\/$/, '')
  const secret = getPlexonServiceSecret()
  const url = `${base}/api/platform/provisioning/audion-project-origin`
  const body: Record<string, string | null> = {
    audionProjectId: params.audionProjectId,
    name: params.name,
    domain: params.domain ?? null,
  }
  if (params.ownerPlexonUserId?.trim()) {
    body.ownerPlexonUserId = params.ownerPlexonUserId.trim()
  }
  if (params.platformCompanyId?.trim()) {
    body.platformCompanyId = params.platformCompanyId.trim()
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.warn('[AUDION-v3] audion-project-origin failed:', res.status, await res.text().catch(() => ''))
      return null
    }
    const data = (await res.json()) as Partial<AudionProjectOriginResult>
    if (typeof data.platformProjectId !== 'string' || !data.platformProjectId.trim()) {
      console.warn('[AUDION-v3] audion-project-origin missing platformProjectId')
      return null
    }
    return {
      platformProjectId: data.platformProjectId,
      checkionProjectId:
        typeof data.checkionProjectId === 'string' ? data.checkionProjectId : undefined,
      platformCompanyId:
        typeof data.platformCompanyId === 'string' ? data.platformCompanyId : undefined,
      ownerPlexonUserId:
        typeof data.ownerPlexonUserId === 'string' ? data.ownerPlexonUserId : undefined,
    }
  } catch (e) {
    console.warn('[AUDION-v3] audion-project-origin error:', e instanceof Error ? e.message : e)
    return null
  }
}
