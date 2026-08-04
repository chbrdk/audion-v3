import { desc, eq } from 'drizzle-orm'
import type {
  UxSavedFlow,
  UxSavedFlowSummary,
  UxSavedFlowWritePayload,
  UxTestFlow,
} from '@audion-v3/contracts'
import { getDb } from './client'
import { uxSavedFlows, type UxSavedFlowRow } from './schema'

function rowToSaved(row: UxSavedFlowRow): UxSavedFlow {
  return {
    id: row.id,
    templateFlowId: row.templateFlowId,
    name: row.name,
    flow: row.flow,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  }
}

function toSummary(row: UxSavedFlow): UxSavedFlowSummary {
  return {
    id: row.id,
    templateFlowId: row.templateFlowId,
    name: row.name,
    updatedAt: row.updatedAt,
  }
}

export async function dbListSavedUxFlows(
  templateFlowId?: string,
): Promise<UxSavedFlowSummary[]> {
  const db = getDb()
  const rows = templateFlowId
    ? await db
        .select()
        .from(uxSavedFlows)
        .where(eq(uxSavedFlows.templateFlowId, templateFlowId))
        .orderBy(desc(uxSavedFlows.updatedAt))
    : await db.select().from(uxSavedFlows).orderBy(desc(uxSavedFlows.updatedAt))
  return rows.map((r) => toSummary(rowToSaved(r)))
}

export async function dbGetSavedUxFlow(id: string): Promise<UxSavedFlow | null> {
  const db = getDb()
  const rows = await db.select().from(uxSavedFlows).where(eq(uxSavedFlows.id, id)).limit(1)
  const row = rows[0]
  return row ? rowToSaved(row) : null
}

export async function dbGetSavedUxFlowByTemplate(
  templateFlowId: string,
): Promise<UxSavedFlow | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(uxSavedFlows)
    .where(eq(uxSavedFlows.templateFlowId, templateFlowId))
    .orderBy(desc(uxSavedFlows.updatedAt))
    .limit(1)
  const row = rows[0]
  return row ? rowToSaved(row) : null
}

export async function dbSaveUxFlow(payload: UxSavedFlowWritePayload): Promise<UxSavedFlow> {
  if (!payload?.templateFlowId?.trim()) {
    throw new Error('templateFlowId is required')
  }
  if (!payload.flow || typeof payload.flow !== 'object') {
    throw new Error('flow is required')
  }
  const flow = structuredClone(payload.flow) as UxTestFlow
  const now = new Date()
  const name = (payload.name?.trim() || flow.name || payload.templateFlowId).trim()
  const db = getDb()

  if (payload.id?.trim()) {
    const existing = await dbGetSavedUxFlow(payload.id.trim())
    if (existing) {
      const nextFlow = { ...flow, id: flow.id || existing.templateFlowId }
      await db
        .update(uxSavedFlows)
        .set({
          name,
          flow: nextFlow,
          updatedAt: now,
        })
        .where(eq(uxSavedFlows.id, existing.id))
      return {
        ...existing,
        name,
        flow: nextFlow,
        updatedAt: now.toISOString(),
      }
    }
  }

  const byTemplate = await dbGetSavedUxFlowByTemplate(payload.templateFlowId.trim())
  if (byTemplate && !payload.id) {
    const nextFlow = { ...flow, id: flow.id || byTemplate.templateFlowId }
    await db
      .update(uxSavedFlows)
      .set({
        name,
        flow: nextFlow,
        updatedAt: now,
      })
      .where(eq(uxSavedFlows.id, byTemplate.id))
    return {
      ...byTemplate,
      name,
      flow: nextFlow,
      updatedAt: now.toISOString(),
    }
  }

  const id =
    payload.id?.trim() ||
    `saved-${payload.templateFlowId.trim()}-${Date.now().toString(36)}`
  const nextFlow = { ...flow, id: flow.id || payload.templateFlowId.trim() }
  const created: UxSavedFlow = {
    id,
    templateFlowId: payload.templateFlowId.trim(),
    name,
    flow: nextFlow,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  await db.insert(uxSavedFlows).values({
    id: created.id,
    templateFlowId: created.templateFlowId,
    name: created.name,
    flow: created.flow,
    createdAt: now,
    updatedAt: now,
  })
  return created
}

export async function dbDeleteSavedUxFlow(id: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db.delete(uxSavedFlows).where(eq(uxSavedFlows.id, id)).returning({
    id: uxSavedFlows.id,
  })
  return deleted.length > 0
}
