import {
  getPlexonAuthUrl,
  getPlexonServiceSecret,
  isPlexonAuthConfigured,
} from './runtime-config'
import { getPlexonContractHeaders } from './plexon-contract'

export { isPlexonAuthConfigured, getPlexonAuthUrl, getPlexonServiceSecret }

export type PlexonAuthUser = { id: string; email: string; name?: string }

export async function validateCredentialsWithPlexon(
  email: string,
  password: string,
): Promise<PlexonAuthUser | null> {
  const baseUrl = getPlexonAuthUrl()
  const secret = getPlexonServiceSecret()
  if (!baseUrl || !secret) return null
  const url = `${baseUrl.replace(/\/$/, '')}/api/auth/validate-credentials`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user?: PlexonAuthUser }
    return data?.user ?? null
  } catch (e) {
    console.error('[AUDION-v3] PLEXON auth error:', e)
    return null
  }
}

export type PlexonProfile = {
  id: string
  email: string
  name?: string
  company?: string
  avatar_url?: string
  locale?: string
  themePreference?: string
  default_platform_company_id?: string
}

const MAX_PLATFORM_COMPANY_ID_LEN = 64

function mapPlexonServiceUser(raw: unknown): PlexonProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const u = raw as Record<string, unknown>
  const id = u.id
  const email = u.email
  if (typeof id !== 'string' || typeof email !== 'string') return null
  let default_platform_company_id: string | undefined
  const defRaw = u.default_platform_company_id
  if (typeof defRaw === 'string') {
    const t = defRaw.trim()
    if (t && t.length <= MAX_PLATFORM_COMPANY_ID_LEN) default_platform_company_id = t
  }
  return {
    id,
    email,
    name: typeof u.name === 'string' ? u.name : undefined,
    company: typeof u.company === 'string' ? u.company : undefined,
    avatar_url: typeof u.avatar_url === 'string' ? u.avatar_url : undefined,
    locale: typeof u.locale === 'string' ? u.locale : undefined,
    themePreference: typeof u.themePreference === 'string' ? u.themePreference : undefined,
    default_platform_company_id,
  }
}

export async function getPlexonProfile(userId: string): Promise<PlexonProfile | null> {
  const baseUrl = getPlexonAuthUrl()
  const secret = getPlexonServiceSecret()
  if (!baseUrl || !secret) return null
  const base = baseUrl.replace(/\/$/, '')
  try {
    const res = await fetch(`${base}/api/services/profile?user_id=${encodeURIComponent(userId)}`, {
      headers: getPlexonContractHeaders(secret),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user?: unknown }
    return mapPlexonServiceUser(data?.user)
  } catch (e) {
    console.error('[AUDION-v3] PLEXON getProfile error:', e)
    return null
  }
}

export async function patchPlexonProfile(
  userId: string,
  updates: {
    name?: string | null
    email?: string
    company?: string | null
    avatar_url?: string | null
    locale?: string | null
    themePreference?: string | null
  },
): Promise<PlexonProfile | null> {
  const baseUrl = getPlexonAuthUrl()
  const secret = getPlexonServiceSecret()
  if (!baseUrl || !secret) return null
  const base = baseUrl.replace(/\/$/, '')
  const body: Record<string, unknown> = { user_id: userId }
  if (updates.name !== undefined) body.name = updates.name
  if (updates.email !== undefined) body.email = updates.email
  if (updates.company !== undefined) body.company = updates.company
  if (updates.avatar_url !== undefined) body.avatar_url = updates.avatar_url
  if (updates.locale !== undefined) body.locale = updates.locale
  if (updates.themePreference !== undefined) body.themePreference = updates.themePreference
  try {
    const res = await fetch(`${base}/api/services/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getPlexonContractHeaders(secret),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { user?: unknown }
    return mapPlexonServiceUser(data?.user)
  } catch (e) {
    console.error('[AUDION-v3] PLEXON patchProfile error:', e)
    return null
  }
}
