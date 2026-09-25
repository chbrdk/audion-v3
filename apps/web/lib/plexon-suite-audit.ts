/**
 * Suite audit ingest → Plexon E4.
 * Spec: specs/domain/suite-enterprise-program.md § E4
 */

import { getPlexonContractHeaders } from './plexon-contract'
import { getPlexonAuthUrl, getPlexonServiceSecret, isPlexonAuthConfigured } from './runtime-config'

export const SUITE_AUDIT_ACTIONS = [
  'run_started',
  'run_finished',
  'published',
  'approved',
  'revoked',
  'exported',
] as const

export type SuiteAuditAction = (typeof SUITE_AUDIT_ACTIONS)[number]

export type PostSuiteAuditInput = {
  platformProjectId: string
  productId: string
  action: SuiteAuditAction
  actorUserId?: string | null
  subjectRef?: string | null
  modelRef?: string | null
  meta?: Record<string, unknown>
}

function plexonApiBase(): string {
  return getPlexonAuthUrl().replace(/\/$/, '')
}

export function suiteAuditApiPath(platformProjectId: string): string {
  return `${plexonApiBase()}/api/platform/provisioning/collections/${encodeURIComponent(platformProjectId.trim())}/audit`
}

function provisioningHeaders(secret: string, actorUserId?: string | null): HeadersInit {
  const actor = actorUserId?.trim()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`,
    ...getPlexonContractHeaders(secret),
    ...(actor ? { 'X-Plexon-User-Id': actor } : {}),
  }
}

export async function postSuiteAuditEvent(input: PostSuiteAuditInput): Promise<boolean> {
  const platformProjectId = input.platformProjectId?.trim()
  const productId = input.productId?.trim()
  const actorUserId = input.actorUserId?.trim()
  if (!platformProjectId || !productId || !actorUserId) return false
  if (!isPlexonAuthConfigured()) return false

  const secret = getPlexonServiceSecret()
  if (!secret) return false

  try {
    const res = await fetch(suiteAuditApiPath(platformProjectId), {
      method: 'POST',
      headers: provisioningHeaders(secret, actorUserId),
      body: JSON.stringify({
        actorUserId,
        productId,
        action: input.action,
        ...(input.subjectRef?.trim() ? { subjectRef: input.subjectRef.trim() } : {}),
        ...(input.modelRef?.trim() ? { modelRef: input.modelRef.trim() } : {}),
        ...(input.meta ? { meta: input.meta } : {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export function scheduleSuiteAuditEvent(input: PostSuiteAuditInput): void {
  void postSuiteAuditEvent(input).catch(() => undefined)
}
