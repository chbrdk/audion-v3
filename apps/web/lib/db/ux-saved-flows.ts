import { desc, eq, sql } from 'drizzle-orm'
import type {
  UxSavedFlow,
  UxSavedFlowSummary,
  UxSavedFlowWritePayload,
  UxTestFlow,
} from '@audion-v3/contracts'
import { getDb } from './client'
import { uxSavedFlows, type UxSavedFlowRow } from './schema'

import type { SavedFlowAclScope } from '../ux-flow-acl'
import { savedFlowVisibleTo } from '../ux-flow-acl'

export type { SavedFlowAclScope }

let schemaReady: Promise<void> | null = null

/** Idempotent: table + Phase-4 ACL columns (owner_id / org_id). */
export async function ensureUxSavedFlowsSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDb()
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ux_saved_flows (
          id text PRIMARY KEY,
          template_flow_id text NOT NULL,
          name text NOT NULL,
          flow jsonb NOT NULL,
          owner_id text,
          org_id text,
          updated_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `)
      await db.execute(sql`ALTER TABLE ux_saved_flows ADD COLUMN IF NOT EXISTS owner_id text`)
      await db.execute(sql`ALTER TABLE ux_saved_flows ADD COLUMN IF NOT EXISTS org_id text`)
    })().catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
}

function rowToSaved(row: UxSavedFlowRow): UxSavedFlow {
  return {
    id: row.id,
    templateFlowId: row.templateFlowId,
    name: row.name,
    flow: row.flow,
    ownerId: row.ownerId ?? null,
    orgId: row.orgId ?? null,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  }
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

export async function dbListSavedUxFlows(
  templateFlowId?: string,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlowSummary[]> {
  await ensureUxSavedFlowsSchema()
  const db = getDb()
  const rows = templateFlowId
    ? await db
        .select()
        .from(uxSavedFlows)
        .where(eq(uxSavedFlows.templateFlowId, templateFlowId))
        .orderBy(desc(uxSavedFlows.updatedAt))
    : await db.select().from(uxSavedFlows).orderBy(desc(uxSavedFlows.updatedAt))
  return rows
    .map((r) => rowToSaved(r))
    .filter((r) => savedFlowVisibleTo(r, scope))
    .map(toSummary)
}

export async function dbGetSavedUxFlow(
  id: string,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlow | null> {
  await ensureUxSavedFlowsSchema()
  const db = getDb()
  const rows = await db.select().from(uxSavedFlows).where(eq(uxSavedFlows.id, id)).limit(1)
  const row = rows[0]
  if (!row) return null
  const saved = rowToSaved(row)
  if (!savedFlowVisibleTo(saved, scope)) return null
  return saved
}

export async function dbGetSavedUxFlowByTemplate(
  templateFlowId: string,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlow | null> {
  await ensureUxSavedFlowsSchema()
  const db = getDb()
  const rows = await db
    .select()
    .from(uxSavedFlows)
    .where(eq(uxSavedFlows.templateFlowId, templateFlowId))
    .orderBy(desc(uxSavedFlows.updatedAt))
  for (const row of rows) {
    const saved = rowToSaved(row)
    if (savedFlowVisibleTo(saved, scope)) return saved
  }
  return null
}

export async function dbSaveUxFlow(
  payload: UxSavedFlowWritePayload,
  scope?: SavedFlowAclScope | null,
): Promise<UxSavedFlow> {
  await ensureUxSavedFlowsSchema()
  if (!payload?.templateFlowId?.trim()) {
    throw new Error('templateFlowId is required')
  }
  if (!payload.flow || typeof payload.flow !== 'object') {
    throw new Error('flow is required')
  }
  const flow = structuredClone(payload.flow) as UxTestFlow
  const now = new Date()
  const name = (payload.name?.trim() || flow.name || payload.templateFlowId).trim()
  const ownerId =
    payload.ownerId !== undefined ? payload.ownerId : (scope?.ownerId ?? null)
  const orgId = payload.orgId !== undefined ? payload.orgId : (scope?.orgId ?? null)
  const db = getDb()

  if (payload.id?.trim()) {
    const existing = await dbGetSavedUxFlow(payload.id.trim(), scope)
    if (existing) {
      const nextFlow = { ...flow, id: flow.id || existing.templateFlowId }
      await db
        .update(uxSavedFlows)
        .set({
          name,
          flow: nextFlow,
          ownerId: ownerId ?? existing.ownerId ?? null,
          orgId: orgId ?? existing.orgId ?? null,
          updatedAt: now,
        })
        .where(eq(uxSavedFlows.id, existing.id))
      return {
        ...existing,
        name,
        flow: nextFlow,
        ownerId: ownerId ?? existing.ownerId ?? null,
        orgId: orgId ?? existing.orgId ?? null,
        updatedAt: now.toISOString(),
      }
    }
  }

  const byTemplate = await dbGetSavedUxFlowByTemplate(payload.templateFlowId.trim(), scope)
  if (byTemplate && !payload.id) {
    const nextFlow = { ...flow, id: flow.id || byTemplate.templateFlowId }
    await db
      .update(uxSavedFlows)
      .set({
        name,
        flow: nextFlow,
        ownerId: ownerId ?? byTemplate.ownerId ?? null,
        orgId: orgId ?? byTemplate.orgId ?? null,
        updatedAt: now,
      })
      .where(eq(uxSavedFlows.id, byTemplate.id))
    return {
      ...byTemplate,
      name,
      flow: nextFlow,
      ownerId: ownerId ?? byTemplate.ownerId ?? null,
      orgId: orgId ?? byTemplate.orgId ?? null,
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
    ownerId: ownerId ?? null,
    orgId: orgId ?? null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  await db.insert(uxSavedFlows).values({
    id: created.id,
    templateFlowId: created.templateFlowId,
    name: created.name,
    flow: created.flow,
    ownerId: created.ownerId ?? null,
    orgId: created.orgId ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return created
}

export async function dbDeleteSavedUxFlow(
  id: string,
  scope?: SavedFlowAclScope | null,
): Promise<boolean> {
  await ensureUxSavedFlowsSchema()
  const existing = await dbGetSavedUxFlow(id, scope)
  if (!existing) return false
  const db = getDb()
  const deleted = await db.delete(uxSavedFlows).where(eq(uxSavedFlows.id, id)).returning({
    id: uxSavedFlows.id,
  })
  return deleted.length > 0
}
