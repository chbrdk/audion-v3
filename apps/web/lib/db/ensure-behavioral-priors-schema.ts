import { sql } from 'drizzle-orm'
import { getDb } from './client'

let ensured = false

/** Add behavioral_priors jsonb on target_groups (idempotent). */
export async function ensureBehavioralPriorsSchema(): Promise<void> {
  if (ensured) return
  const db = getDb()
  await db.execute(
    sql`ALTER TABLE target_groups ADD COLUMN IF NOT EXISTS behavioral_priors jsonb`,
  )
  ensured = true
}
