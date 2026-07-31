import { eq } from 'drizzle-orm'
import type { AssistTemplateOverridePayload } from '../fixtures/prompt-overrides-store'
import { getDb } from './client'
import { assistPromptOverrides } from './schema'

function rowToPayload(row: typeof assistPromptOverrides.$inferSelect): AssistTemplateOverridePayload {
  return {
    system: row.system,
    user: row.user,
    prompt: row.prompt,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function dbGetPromptOverride(
  templateId: string,
): Promise<AssistTemplateOverridePayload | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(assistPromptOverrides)
    .where(eq(assistPromptOverrides.templateId, templateId))
    .limit(1)
  const row = rows[0]
  return row ? rowToPayload(row) : null
}

export async function dbListPromptOverrideIds(): Promise<string[]> {
  const db = getDb()
  const rows = await db.select({ id: assistPromptOverrides.templateId }).from(assistPromptOverrides)
  return rows.map((r) => r.id)
}

export async function dbUpsertPromptOverride(
  templateId: string,
  patch: { system?: string | null; user?: string | null; prompt?: string | null },
): Promise<AssistTemplateOverridePayload> {
  const prev = await dbGetPromptOverride(templateId)
  const next: AssistTemplateOverridePayload = {
    system: patch.system !== undefined ? patch.system : (prev?.system ?? null),
    user: patch.user !== undefined ? patch.user : (prev?.user ?? null),
    prompt: patch.prompt !== undefined ? patch.prompt : (prev?.prompt ?? null),
    updatedAt: new Date().toISOString(),
  }
  const db = getDb()
  const now = new Date(next.updatedAt)
  await db
    .insert(assistPromptOverrides)
    .values({
      templateId,
      system: next.system,
      user: next.user,
      prompt: next.prompt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: assistPromptOverrides.templateId,
      set: {
        system: next.system,
        user: next.user,
        prompt: next.prompt,
        updatedAt: now,
      },
    })
  return next
}

export async function dbDeletePromptOverride(templateId: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db
    .delete(assistPromptOverrides)
    .where(eq(assistPromptOverrides.templateId, templateId))
    .returning({ id: assistPromptOverrides.templateId })
  return deleted.length > 0
}
