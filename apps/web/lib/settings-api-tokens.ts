/**
 * Settings Admin — API token CRUD helpers.
 * Spec: specs/api/settings-tokens.md
 */

import type {
  SettingsApiTokenCreateResponse,
  SettingsApiTokenListResponse,
  SettingsApiTokenVerifyResponse,
} from '@audion-v3/contracts'
import {
  resolveApiTokenOwner,
  storeCreateApiToken,
  storeListApiTokens,
  storeRevokeApiToken,
} from './fixtures/api-tokens-store'
import { paths } from './paths'

export type ApiTokensError = { error: string; status: number }

export function toApiTokenOwnerId(sessionUser?: {
  id?: string | null
  email?: string | null
} | null): string {
  const id = sessionUser?.id?.trim()
  if (id) return id
  const email = sessionUser?.email?.trim()
  if (email) return email
  return paths.apiTokenFixtureOwnerId
}

export function listApiTokensForOwner(ownerId: string): SettingsApiTokenListResponse {
  return {
    items: storeListApiTokens(ownerId).map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
    })),
  }
}

export function createApiTokenForOwner(
  ownerId: string,
  name?: string | null,
): SettingsApiTokenCreateResponse {
  const { record, token } = storeCreateApiToken(ownerId, name)
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    token,
  }
}

export function revokeApiTokenForOwner(
  tokenId: string,
  ownerId: string,
): { ok: true } | ApiTokensError {
  if (!tokenId.trim()) {
    return { error: 'tokenId is required', status: 400 }
  }
  if (!storeRevokeApiToken(tokenId, ownerId)) {
    return { error: 'Token not found or already revoked', status: 404 }
  }
  return { ok: true }
}

export function verifyApiTokenBearer(
  authorization: string | null | undefined,
): SettingsApiTokenVerifyResponse | ApiTokensError {
  const resolved = resolveApiTokenOwner(authorization)
  if (!resolved) {
    return { error: 'Invalid or missing API token', status: 401 }
  }
  return { ok: true, ownerId: resolved.ownerId, tokenId: resolved.tokenId }
}
