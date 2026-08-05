/**
 * UX Test Flow saved-snapshot persistence.
 * - With DATABASE_URL: Postgres `ux_saved_flows` (drizzle)
 * - Without: in-memory (local/dev/tests)
 * @see specs/domain/ux-test-flow-model.md — Persistence — ux_saved_flows
 */
import type {
  UxSavedFlow,
  UxSavedFlowSummary,
  UxSavedFlowWritePayload,
  UxTestFlow,
} from '@audion-v3/contracts'
import { isProjectsDatabaseConfigured } from '../db/config'
import {
  savedFlowVisibleTo,
  type SavedFlowAclScope,
} from '../ux-flow-acl'

async function dbApi() {
  return import('../db/ux-saved-flows')
}

export type { SavedFlowAclScope }

let saved: UxSavedFlow[] = []

export function resetUxFlowStore(): void {
  saved = []
}

function toSummary(row: UxSavedFlow): UxSavedFlowSummary {
  return {
    id: row.id,
    templateFlowId: row.templateFlowId,
    name: row.name,
    ownerId: row.ownerId ?? null,
    orgId: row.orgId ?? null,
    updatedAt: row.updatedAt,
  }
}

function memoryListSavedUxFlows(
  templateFlowId?: string,
  scope?: SavedFlowAclScope | null,
): UxSavedFlowSummary[] {
  const rows = templateFlowId
    ? saved.filter((s) => s.templateFlowId === templateFlowId)
    : saved
  return rows
    .filter((s) => savedFlowVisibleTo(s, scope))
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary)
}

function memoryGetSavedUxFlow(
  id: string,
  scope?: SavedFlowAclScope | null,
): UxSavedFlow | null {
  const row = saved.find((s) => s.id === id) ?? null
  if (!row) return null
  if (!savedFlowVisibleTo(row, scope)) return null
  return row
}

function memoryGetSavedUxFlowByTemplate(
  templateFlowId: string,
  scope?: SavedFlowAclScope | null,
): UxSavedFlow | null {
  const matches = saved
    .filter((s) => s.templateFlowId === templateFlowId)
    .filter((s) => savedFlowVisibleTo(s, scope))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return matches[0] ?? null
}

function memorySaveUxFlow(
  payload: UxSavedFlowWritePayload,
  scope?: SavedFlowAclScope | null,
): UxSavedFlow {
  if (!payload?.templateFlowId?.trim()) {
    throw new Error('templateFlowId is required')
  }
  if (!payload.flow || typeof payload.flow !== 'object') {
    throw new Error('flow is required')
  }
  const flow = structuredClone(payload.flow) as UxTestFlow
  const now = new Date().toISOString()
  const name = (payload.name?.trim() || flow.name || payload.templateFlowId).trim()
  const ownerId =
    payload.ownerId !== undefined ? payload.ownerId : (scope?.ownerId ?? null)
  const orgId = payload.orgId !== undefined ? payload.orgId : (scope?.orgId ?? null)

  if (payload.id?.trim()) {
    const idx = saved.findIndex((s) => s.id === payload.id)
    if (idx >= 0) {
      const prev = saved[idx]!
      if (!savedFlowVisibleTo(prev, scope)) {
        throw new Error('Forbidden')
      }
      const next: UxSavedFlow = {
        ...prev,
        name,
        flow: { ...flow, id: flow.id || prev.templateFlowId },
        ownerId: ownerId ?? prev.ownerId ?? null,
        orgId: orgId ?? prev.orgId ?? null,
        updatedAt: now,
      }
      saved = [...saved.slice(0, idx), next, ...saved.slice(idx + 1)]
      return next
    }
  }

  const existing = memoryGetSavedUxFlowByTemplate(payload.templateFlowId, scope)
  if (existing && !payload.id) {
    const next: UxSavedFlow = {
      ...existing,
      name,
      flow: { ...flow, id: flow.id || existing.templateFlowId },
      ownerId: ownerId ?? existing.ownerId ?? null,
      orgId: orgId ?? existing.orgId ?? null,
      updatedAt: now,
    }
    saved = saved.map((s) => (s.id === existing.id ? next : s))
    return next
  }

  const id =
    payload.id?.trim() ||
    `saved-${payload.templateFlowId.trim()}-${Date.now().toString(36)}`
  const created: UxSavedFlow = {
    id,
    templateFlowId: payload.templateFlowId.trim(),
    name,
    flow: { ...flow, id: flow.id || payload.templateFlowId },
    ownerId: ownerId ?? null,
    orgId: orgId ?? null,
    createdAt: now,
    updatedAt: now,
  }
  saved = [created, ...saved]
  return created
}

function memoryDeleteSavedUxFlow(
  id: string,
  scope?: SavedFlowAclScope | null,
): boolean {
  const existing = memoryGetSavedUxFlow(id, scope)
  if (!existing) return false
  const before = saved.length
  saved = saved.filter((s) => s.id !== id)
  return saved.length < before
}

/** @deprecated Prefer storeListSavedUxFlows — sync memory helper for tests. */
export function listSavedUxFlows(templateFlowId?: string): UxSavedFlowSummary[] {
  return memoryListSavedUxFlows(templateFlowId)
}

/** @deprecated Prefer storeGetSavedUxFlow — sync memory helper for tests. */
export function getSavedUxFlow(id: string): UxSavedFlow | null {
  return memoryGetSavedUxFlow(id)
}

/** @deprecated Prefer storeGetSavedUxFlowByTemplate — sync memory helper for tests. */
export function getSavedUxFlowByTemplate(templateFlowId: string): UxSavedFlow | null {
  return memoryGetSavedUxFlowByTemplate(templateFlowId)
}

/** @deprecated Prefer storeSaveUxFlow — sync memory helper for tests. */
export function saveUxFlow(payload: UxSavedFlowWritePayload): UxSavedFlow {
  return memorySaveUxFlow(payload)
}

/** @deprecated Prefer storeDeleteSavedUxFlow — sync memory helper for tests. */
export function deleteSavedUxFlow(id: string): boolean {
  return memoryDeleteSavedUxFlow(id)
}

export async function storeListSavedUxFlows(
  templateFlowId?: string,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlowSummary[]> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbListSavedUxFlows(templateFlowId, scope)
  }
  return memoryListSavedUxFlows(templateFlowId, scope)
}

export async function storeGetSavedUxFlow(
  id: string,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlow | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetSavedUxFlow(id, scope)
  }
  return memoryGetSavedUxFlow(id, scope)
}

export async function storeGetSavedUxFlowByTemplate(
  templateFlowId: string,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlow | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetSavedUxFlowByTemplate(templateFlowId, scope)
  }
  return memoryGetSavedUxFlowByTemplate(templateFlowId, scope)
}

export async function storeSaveUxFlow(
  payload: UxSavedFlowWritePayload,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlow> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbSaveUxFlow(payload, scope)
  }
  return memorySaveUxFlow(payload, scope)
}

export async function storeDeleteSavedUxFlow(
  id: string,
  scope?: SavedFlowAclScope | null,
): Promise<boolean> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbDeleteSavedUxFlow(id, scope)
  }
  return memoryDeleteSavedUxFlow(id, scope)
}
