#!/usr/bin/env npx tsx
/**
 * Seed Vaillant Group UC1 personas directly into Postgres (container / operator).
 *
 *   npx tsx scripts/seed-vaillant-group-mafo-store.ts
 */

import { seedVaillantGroupMafoPersonas } from '../apps/web/lib/demo/seed-vaillant-group-mafo-personas.ts'

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL required for store seed')
    process.exit(1)
  }

  const result = await seedVaillantGroupMafoPersonas()
  console.log(`Project: ${result.projectId}`)
  for (const id of result.skipped) console.log(`skip (exists): ${id}`)
  for (const id of result.created) console.log(`created: ${id}`)
  console.log(`Done (${result.created.length} created, ${result.skipped.length} skipped).`)
}

main().catch((e: Error) => {
  console.error(e.message)
  process.exit(1)
})
