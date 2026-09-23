import { sql } from 'drizzle-orm'
import { getDb } from './client'

let ensured = false

/** Add slug columns + backfill from name (idempotent). Spec: entity-url-slugs.md */
export async function ensureEntitySlugSchema(): Promise<void> {
  if (ensured) return
  const db = getDb()
  await db.execute(sql`ALTER TABLE personas ADD COLUMN IF NOT EXISTS slug text`)
  await db.execute(sql`ALTER TABLE target_groups ADD COLUMN IF NOT EXISTS slug text`)
  await db.execute(sql`
    UPDATE personas
    SET slug = lower(
      trim(
        both '-' from
        regexp_replace(regexp_replace(coalesce(name, 'item'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
      )
    )
    WHERE slug IS NULL OR btrim(slug) = ''
  `)
  await db.execute(sql`
    UPDATE target_groups
    SET slug = lower(
      trim(
        both '-' from
        regexp_replace(regexp_replace(coalesce(name, 'item'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
      )
    )
    WHERE slug IS NULL OR btrim(slug) = ''
  `)
  ensured = true
}
