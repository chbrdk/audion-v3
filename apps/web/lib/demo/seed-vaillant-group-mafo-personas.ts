/**
 * Idempotent Vaillant Group MaFo seed (Postgres store).
 * Used by container entrypoint and operator scripts — no HTTP Bearer required.
 */

import {
  VAILLANT_GROUP_ALL_MAFO_PERSONAS,
  VAILLANT_GROUP_AUDION_PROJECT_ID,
} from '../fixtures/vaillant-group-mafo-seed'
import { dbInsertPersonaDetail, dbPersonaDetail } from '../db/personas'
import { seedVaillantGroupMafoTargetGroups } from './seed-vaillant-group-mafo-target-groups'

export type SeedVaillantGroupMafoResult = {
  projectId: string
  personas: { created: string[]; skipped: string[] }
  targetGroups: { created: string[]; updated: string[]; skipped: string[] }
}

export async function seedVaillantGroupMafoPersonas(): Promise<{
  projectId: string
  created: string[]
  skipped: string[]
}> {
  const created: string[] = []
  const skipped: string[] = []

  for (const seed of VAILLANT_GROUP_ALL_MAFO_PERSONAS) {
    const existing = await dbPersonaDetail(seed.id)
    if (existing) {
      skipped.push(seed.id)
      continue
    }
    await dbInsertPersonaDetail(seed)
    created.push(seed.id)
  }

  return {
    projectId: VAILLANT_GROUP_AUDION_PROJECT_ID,
    created,
    skipped,
  }
}

/** Personas first, then target groups (links require persona rows). */
export async function seedVaillantGroupMafoStore(): Promise<SeedVaillantGroupMafoResult> {
  const personas = await seedVaillantGroupMafoPersonas()
  const targetGroups = await seedVaillantGroupMafoTargetGroups()
  return {
    projectId: VAILLANT_GROUP_AUDION_PROJECT_ID,
    personas: { created: personas.created, skipped: personas.skipped },
    targetGroups: {
      created: targetGroups.created,
      updated: targetGroups.updated,
      skipped: targetGroups.skipped,
    },
  }
}
