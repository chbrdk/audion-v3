/**
 * Idempotent Vaillant Group UC1 persona seed (Postgres store).
 * Used by container entrypoint and operator scripts — no HTTP Bearer required.
 */

import {
  VAILLANT_GROUP_AUDION_PROJECT_ID,
  VAILLANT_GROUP_UC1_PERSONAS,
} from '../fixtures/vaillant-group-mafo-seed'
import { dbInsertPersonaDetail, dbPersonaDetail } from '../db/personas'

export type SeedVaillantGroupMafoResult = {
  projectId: string
  created: string[]
  skipped: string[]
}

export async function seedVaillantGroupMafoPersonas(): Promise<SeedVaillantGroupMafoResult> {
  const created: string[] = []
  const skipped: string[] = []

  for (const seed of VAILLANT_GROUP_UC1_PERSONAS) {
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
