/**
 * Bearer API token auth + getRequestUser for machine clients (assistant / MCP).
 * Spec: plexon-v3/specs/domain/assistant-actor-identity.md
 *
 * Machine env AUDION_API_TOKEN is not a viewer — viewer = X-Plexon-User-Id (fail closed).
 */

import { resolveApiTokenOwner } from './fixtures/api-tokens-store'
import { isProvisioningAuthorized } from './plexon-contract'
import { paths } from './paths'
import { getPlexonServiceSecret } from './runtime-config'

export const PLEXON_USER_ID_HEADER = 'X-Plexon-User-Id'

function extractRawBearer(authorization: string | null | undefined): string | null {
  if (!authorization) return null
  let raw = authorization.trim()
  if (raw.toLowerCase().startsWith('bearer ')) raw = raw.slice(7).trim()
  return raw || null
}

export function isAudionMachineEnvToken(rawBearer: string | null | undefined): boolean {
  const raw = extractRawBearer(rawBearer)
  if (!raw) return false
  const envTok =
    process.env[paths.audionApiTokenEnvKey]?.trim() ||
    process.env.AUDION_SERVICE_TOKEN?.trim() ||
    ''
  return Boolean(envTok && raw === envTok)
}

export async function getUserFromBearerToken(
  request: Request,
): Promise<{ id: string } | null> {
  if (isAudionMachineEnvToken(request.headers.get('Authorization'))) {
    return null
  }
  const resolved = resolveApiTokenOwner(request.headers.get('Authorization'))
  return resolved ? { id: resolved.ownerId } : null
}

/**
 * Order: service secret + actor → machine Bearer + actor → personal Bearer → session.
 */
export async function getRequestUser(request: Request): Promise<{ id: string } | null> {
  const actor = request.headers.get(PLEXON_USER_ID_HEADER)?.trim() || ''
  const secret = getPlexonServiceSecret()
  if (secret && isProvisioningAuthorized(request, secret)) {
    return actor ? { id: actor } : null
  }

  if (isAudionMachineEnvToken(request.headers.get('Authorization'))) {
    return actor ? { id: actor } : null
  }

  const bearer = await getUserFromBearerToken(request)
  if (bearer) return bearer

  const { auth } = await import('../auth')
  const session = await auth()
  return session?.user?.id ? { id: session.user.id } : null
}
