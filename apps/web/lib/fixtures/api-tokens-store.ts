/**
 * In-memory API token store (fixtures until product Postgres).
 * Spec: specs/domain/settings-api-tokens.md
 */

import { createHash, randomBytes } from 'node:crypto'
import { paths } from '../paths'

export type ApiTokenRecord = {
  id: string
  ownerId: string
  name: string | null
  tokenHash: string
  createdAt: string
}

type Store = {
  byId: Map<string, ApiTokenRecord>
  byHash: Map<string, string>
}

const g = globalThis as unknown as { __audionApiTokensStore?: Store }

function store(): Store {
  if (!g.__audionApiTokensStore) {
    g.__audionApiTokensStore = { byId: new Map(), byHash: new Map() }
  }
  return g.__audionApiTokensStore
}

export function resetApiTokensStore(): void {
  store().byId.clear()
  store().byHash.clear()
}

export function hashApiToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex')
}

export function generateApiTokenString(): string {
  return `${paths.apiTokenPrefix}${randomBytes(paths.apiTokenBytes).toString('hex')}`
}

function newTokenId(): string {
  return `tok-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`
}

export function storeListApiTokens(ownerId: string): ApiTokenRecord[] {
  return [...store().byId.values()]
    .filter((t) => t.ownerId === ownerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function storeCreateApiToken(
  ownerId: string,
  name?: string | null,
): { record: ApiTokenRecord; token: string } {
  const token = generateApiTokenString()
  const tokenHash = hashApiToken(token)
  const record: ApiTokenRecord = {
    id: newTokenId(),
    ownerId,
    name: (name || '').trim() || null,
    tokenHash,
    createdAt: new Date().toISOString(),
  }
  store().byId.set(record.id, record)
  store().byHash.set(tokenHash, record.id)
  return { record, token }
}

export function storeRevokeApiToken(tokenId: string, ownerId: string): boolean {
  const row = store().byId.get(tokenId)
  if (!row || row.ownerId !== ownerId) return false
  store().byId.delete(tokenId)
  store().byHash.delete(row.tokenHash)
  return true
}

/** Strip optional `Bearer ` prefix; return raw token or null. */
export function extractRawApiToken(
  rawBearer: string | null | undefined,
): string | null {
  if (!rawBearer) return null
  let raw = rawBearer.trim()
  if (raw.toLowerCase().startsWith('bearer ')) {
    raw = raw.slice(7).trim()
  }
  return raw || null
}

/**
 * Resolve owner from raw Bearer token (with or without "Bearer " prefix).
 * Also accepts `process.env[paths.audionApiTokenEnvKey]` (machine / Coolify).
 */
export function resolveApiTokenOwner(
  rawBearer: string | null | undefined,
): { ownerId: string; tokenId: string } | null {
  const raw = extractRawApiToken(rawBearer)
  if (!raw) return null
  if (!raw.startsWith(paths.apiTokenPrefix)) return null

  const envTok = process.env[paths.audionApiTokenEnvKey]?.trim()
  if (envTok && raw === envTok) {
    return {
      ownerId: paths.apiTokenFixtureOwnerId,
      tokenId: 'tok-env',
    }
  }

  const id = store().byHash.get(hashApiToken(raw))
  if (!id) return null
  const row = store().byId.get(id)
  if (!row) return null
  return { ownerId: row.ownerId, tokenId: row.id }
}
