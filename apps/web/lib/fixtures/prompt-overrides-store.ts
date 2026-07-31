/**
 * Assist template overrides facade.
 * - With DATABASE_URL: Postgres (drizzle)
 * - Without: in-memory fixtures (local/dev/tests)
 * Spec: specs/domain/prompt-templating.md · specs/api/settings-prompts.md
 */

import { isProjectsDatabaseConfigured } from '../db/config'

export type AssistTemplateOverridePayload = {
  system?: string | null
  user?: string | null
  prompt?: string | null
  updatedAt: string
}

type Store = {
  byId: Map<string, AssistTemplateOverridePayload>
}

const g = globalThis as unknown as { __audionPromptOverridesStore?: Store }

function store(): Store {
  if (!g.__audionPromptOverridesStore) {
    g.__audionPromptOverridesStore = { byId: new Map() }
  }
  return g.__audionPromptOverridesStore
}

async function dbApi() {
  return import('../db/prompt-overrides')
}

export function resetPromptOverridesStore(): void {
  store().byId.clear()
}

export async function getPromptOverride(
  templateId: string,
): Promise<AssistTemplateOverridePayload | null> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbGetPromptOverride(templateId)
  }
  return store().byId.get(templateId) ?? null
}

export async function listPromptOverrideIds(): Promise<string[]> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbListPromptOverrideIds()
  }
  return [...store().byId.keys()]
}

export async function upsertPromptOverride(
  templateId: string,
  patch: { system?: string | null; user?: string | null; prompt?: string | null },
): Promise<AssistTemplateOverridePayload> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbUpsertPromptOverride(templateId, patch)
  }
  const prev = store().byId.get(templateId)
  const next: AssistTemplateOverridePayload = {
    system: patch.system !== undefined ? patch.system : (prev?.system ?? null),
    user: patch.user !== undefined ? patch.user : (prev?.user ?? null),
    prompt: patch.prompt !== undefined ? patch.prompt : (prev?.prompt ?? null),
    updatedAt: new Date().toISOString(),
  }
  store().byId.set(templateId, next)
  return next
}

export async function deletePromptOverride(templateId: string): Promise<boolean> {
  if (isProjectsDatabaseConfigured()) {
    const db = await dbApi()
    return db.dbDeletePromptOverride(templateId)
  }
  return store().byId.delete(templateId)
}
