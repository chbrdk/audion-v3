import { eq } from 'drizzle-orm'
import type { PersonaPromptRecord } from '../fixtures/persona-prompts-store'
import { getDb } from './client'
import { personaChatPrompts } from './schema'

const DEFAULT_VERSION = '2026-07-chat-v1'

function rowToRecord(row: typeof personaChatPrompts.$inferSelect): PersonaPromptRecord {
  return {
    personaId: row.personaId,
    systemPrompt: row.systemPrompt,
    systemPromptDe: row.systemPromptDe ?? null,
    templateVersion: row.templateVersion,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function dbGetPersonaChatPrompt(
  personaId: string,
): Promise<PersonaPromptRecord | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(personaChatPrompts)
    .where(eq(personaChatPrompts.personaId, personaId))
    .limit(1)
  const row = rows[0]
  return row ? rowToRecord(row) : null
}

export async function dbUpsertPersonaChatPrompt(
  personaId: string,
  patch: {
    systemPrompt: string
    systemPromptDe?: string | null
    templateVersion?: string | null
  },
): Promise<PersonaPromptRecord> {
  const prev = await dbGetPersonaChatPrompt(personaId)
  const next: PersonaPromptRecord = {
    personaId,
    systemPrompt: patch.systemPrompt.trim(),
    systemPromptDe:
      patch.systemPromptDe === undefined
        ? (prev?.systemPromptDe ?? null)
        : patch.systemPromptDe?.trim() || null,
    templateVersion: (patch.templateVersion || '').trim() || DEFAULT_VERSION,
    updatedAt: new Date().toISOString(),
  }
  const db = getDb()
  const now = new Date(next.updatedAt)
  await db
    .insert(personaChatPrompts)
    .values({
      personaId: next.personaId,
      systemPrompt: next.systemPrompt,
      systemPromptDe: next.systemPromptDe,
      templateVersion: next.templateVersion,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: personaChatPrompts.personaId,
      set: {
        systemPrompt: next.systemPrompt,
        systemPromptDe: next.systemPromptDe,
        templateVersion: next.templateVersion,
        updatedAt: now,
      },
    })
  return next
}

export async function dbDeletePersonaChatPrompt(personaId: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db
    .delete(personaChatPrompts)
    .where(eq(personaChatPrompts.personaId, personaId))
    .returning({ id: personaChatPrompts.personaId })
  return deleted.length > 0
}

export async function dbListPersonaChatPromptIds(): Promise<string[]> {
  const db = getDb()
  const rows = await db.select({ id: personaChatPrompts.personaId }).from(personaChatPrompts)
  return rows.map((r) => r.id)
}

export async function dbGetPersonaChatPromptMap(): Promise<Map<string, PersonaPromptRecord>> {
  const db = getDb()
  const rows = await db.select().from(personaChatPrompts)
  return new Map(rows.map((row) => [row.personaId, rowToRecord(row)]))
}
