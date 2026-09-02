#!/usr/bin/env npx tsx
/**
 * Seed Vaillant Group UC1 personas directly into Postgres (container / operator).
 *
 *   npx tsx scripts/seed-vaillant-group-mafo-store.ts
 */

import { seedVaillantGroupMafoStore } from '../apps/web/lib/demo/seed-vaillant-group-mafo-personas'

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL required for store seed')
    process.exit(1)
  }

  const result = await seedVaillantGroupMafoStore()
  console.log(`Project: ${result.projectId}`)
  for (const id of result.personas.skipped) console.log(`persona skip (exists): ${id}`)
  for (const id of result.personas.created) console.log(`persona created: ${id}`)
  for (const id of result.targetGroups.skipped) console.log(`target-group skip (ok): ${id}`)
  for (const id of result.targetGroups.updated) console.log(`target-group updated: ${id}`)
  for (const id of result.targetGroups.created) console.log(`target-group created: ${id}`)
  console.log(
    `Done (personas: ${result.personas.created.length} created; target groups: ${result.targetGroups.created.length} created, ${result.targetGroups.updated.length} updated).`,
  )
}

main().catch((e: Error) => {
  console.error(e.message)
  process.exit(1)
})
