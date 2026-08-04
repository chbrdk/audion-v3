/**
 * UX Test Flow saved-snapshot persistence.
 * Fixture/native in-memory store (same pattern as ux-study-store without Postgres yet).
 * @see specs/domain/ux-test-flow-model.md — Canvas (session edit + persist)
 */
import type {
  UxSavedFlow,
  UxSavedFlowSummary,
  UxSavedFlowWritePayload,
  UxTestFlow,
} from '@audion-v3/contracts'

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

export function listSavedUxFlows(templateFlowId?: string): UxSavedFlowSummary[] {
  const rows = templateFlowId
    ? saved.filter((s) => s.templateFlowId === templateFlowId)
    : saved
  return rows
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toSummary)
}

export function getSavedUxFlow(id: string): UxSavedFlow | null {
  return saved.find((s) => s.id === id) ?? null
}

export function getSavedUxFlowByTemplate(templateFlowId: string): UxSavedFlow | null {
  const matches = saved
    .filter((s) => s.templateFlowId === templateFlowId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return matches[0] ?? null
}

export function saveUxFlow(payload: UxSavedFlowWritePayload): UxSavedFlow {
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

  const existing = getSavedUxFlowByTemplate(payload.templateFlowId)
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

export function deleteSavedUxFlow(id: string): boolean {
  const before = saved.length
  saved = saved.filter((s) => s.id !== id)
  return saved.length < before
}
