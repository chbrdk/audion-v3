/**
 * Saved-flow ACL helpers (Phase 4 foundation).
 * @see specs/domain/ux-test-flow-model.md — Persistence ACL
 */

import type { UxSavedFlow } from '@audion-v3/contracts'

export type SavedFlowAclScope = {
  ownerId?: string | null
  orgId?: string | null
}

/** Visible when legacy (no owner/org) or matches requester owner / org. */
export function savedFlowVisibleTo(
  row: Pick<UxSavedFlow, 'ownerId' | 'orgId'>,
  scope?: SavedFlowAclScope | null,
): boolean {
  if (!row.ownerId && !row.orgId) return true
  if (!scope?.ownerId && !scope?.orgId) return true
  if (scope.ownerId && row.ownerId === scope.ownerId) return true
  if (scope.orgId && row.orgId === scope.orgId) return true
  return false
}

/** Session user → ACL scope (null owner when anonymous). */
export function savedFlowScopeFromSession(sessionUser?: {
  id?: string | null
} | null): SavedFlowAclScope {
  const ownerId = sessionUser?.id?.trim() || null
  return { ownerId, orgId: null }
}
