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

export type AudionProjectOriginFailure = {
  ok: false
  status: number
  detail: string
}

/**
 * Register an AUDION-origin project on the Plexon control plane.
 * Owner/company optional — Plexon auto-resolves when omitted (service secret).
 */
export async function registerAudionProjectOnPlexon(params: {
  audionProjectId: string
  name: string
  domain?: string | null
  ownerPlexonUserId?: string | null
  platformCompanyId?: string | null
}): Promise<AudionProjectOriginResult | null> {
  const result = await registerAudionProjectOnPlexonDetailed(params)
  return result && 'platformProjectId' in result ? result : null
}

/** Same as registerAudionProjectOnPlexon but returns upstream error detail. */
export async function registerAudionProjectOnPlexonDetailed(params: {
  audionProjectId: string
  name: string
  domain?: string | null
  ownerPlexonUserId?: string | null
  platformCompanyId?: string | null
}): Promise<AudionProjectOriginResult | AudionProjectOriginFailure | null> {
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
    const text = await res.text().catch(() => '')
    if (!res.ok) {
      console.warn('[AUDION-v3] audion-project-origin failed:', res.status, text)
      return { ok: false, status: res.status, detail: text.slice(0, 800) || res.statusText }
    }
    let data: Partial<AudionProjectOriginResult> = {}
    try {
      data = text ? (JSON.parse(text) as Partial<AudionProjectOriginResult>) : {}
    } catch {
      return { ok: false, status: 502, detail: `Invalid JSON from Plexon: ${text.slice(0, 200)}` }
    }
    if (typeof data.platformProjectId !== 'string' || !data.platformProjectId.trim()) {
      console.warn('[AUDION-v3] audion-project-origin missing platformProjectId')
      return { ok: false, status: 502, detail: 'Plexon response missing platformProjectId' }
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
    const msg = e instanceof Error ? e.message : String(e)
    console.warn('[AUDION-v3] audion-project-origin error:', msg)
    return { ok: false, status: 502, detail: msg }
  }
}
