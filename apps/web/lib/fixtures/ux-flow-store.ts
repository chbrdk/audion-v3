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

async function dbApi() {
  return import('../db/ux-saved-flows')
}

let saved: UxSavedFlow[] = []

export function resetUxFlowStore(): void {
  saved = []
}

function toSummary(row: UxSavedFlow): UxSavedFlowSummary {
  return {
    id: row.id,
    templateFlowId: row.templateFlowId,
    name: row.name,
    updatedAt: row.updatedAt,
  }
}

function memoryListSavedUxFlows(templateFlowId?: string): UxSavedFlowSummary[] {
  const rows = templateFlowId
    ? saved.filter((s) => s.templateFlowId === templateFlowId)
    : saved
  return rows
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary)
}

function memoryGetSavedUxFlow(id: string): UxSavedFlow | null {
  return saved.find((s) => s.id === id) ?? null
}

function memoryGetSavedUxFlowByTemplate(templateFlowId: string): UxSavedFlow | null {
  const matches = saved
    .filter((s) => s.templateFlowId === templateFlowId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return matches[0] ?? null
}

function memorySaveUxFlow(payload: UxSavedFlowWritePayload): UxSavedFlow {
  if (!payload?.templateFlowId?.trim()) {
    throw new Error('templateFlowId is required')
  }
  if (!payload.flow || typeof payload.flow !== 'object') {
    throw new Error('flow is required')
  }
  const flow = structuredClone(payload.flow) as UxTestFlow
  const now = new Date().toISOString()
  const name = (payload.name?.trim() || flow.name || payload.templateFlowId).trim()

  if (payload.id?.trim()) {
    const idx = saved.findIndex((s) => s.id === payload.id)
    if (idx >= 0) {
      const prev = saved[idx]!
      const next: UxSavedFlow = {
        ...prev,
        name,
        flow: { ...flow, id: flow.id || prev.templateFlowId },
        updatedAt: now,
      }
      saved = [...saved.slice(0, idx), next, ...saved.slice(idx + 1)]
      return next
    }
  }

  const existing = memoryGetSavedUxFlowByTemplate(payload.templateFlowId)
  if (existing && !payload.id) {
    const next: UxSavedFlow = {
      ...existing,
      name,
      flow: { ...flow, id: flow.id || existing.templateFlowId },
      updatedAt: now,
    }
    saved = saved.map((s) => (s.id === existing.id ? next : s))
    return next
  }

  const id =
    payload.id?.trim() ||
    `saved-${payload.templateFlowId}-${Date.now().toString(36)}`
  const created: UxSavedFlow = {
    id,
    templateFlowId: payload.templateFlowId.trim(),
    name,
    flow: { ...flow, id: flow.id || payload.templateFlowId },
    createdAt: now,
    updatedAt: now,
  }
  saved = [created, ...saved]
  return created
}

function memoryDeleteSavedUxFlow(id: string): boolean {
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
): Promise<UxSavedFlowSummary[]> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbListSavedUxFlows(templateFlowId)
  }
  return memoryListSavedUxFlows(templateFlowId)
}

export async function storeGetSavedUxFlow(id: string): Promise<UxSavedFlow | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetSavedUxFlow(id)
  }
  return memoryGetSavedUxFlow(id)
}

export async function storeGetSavedUxFlowByTemplate(
  templateFlowId: string,
): Promise<UxSavedFlow | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetSavedUxFlowByTemplate(templateFlowId)
  }
  return memoryGetSavedUxFlowByTemplate(templateFlowId)
}

export async function storeSaveUxFlow(
  payload: UxSavedFlowWritePayload,
): Promise<UxSavedFlow> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbSaveUxFlow(payload)
  }
  return memorySaveUxFlow(payload)
}

export async function storeDeleteSavedUxFlow(id: string): Promise<boolean> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbDeleteSavedUxFlow(id)
  }
  return memoryDeleteSavedUxFlow(id)
}
