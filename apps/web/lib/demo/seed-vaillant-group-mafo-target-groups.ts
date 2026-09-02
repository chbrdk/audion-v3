/**
 * Idempotent Vaillant Group target-group seed (Postgres store).
 * Links personas to project-scoped target groups for UC1 + UC2.
 */

import type { TargetGroupDetail } from '@audion-v3/contracts'
import {
  VAILLANT_GROUP_ALL_MAFO_TARGET_GROUPS,
  VAILLANT_GROUP_AUDION_PROJECT_ID,
  type VaillantGroupTargetGroupSeed,
} from '../fixtures/vaillant-group-mafo-seed'
import { dbPersonaSummariesByIds } from '../db/personas'
import {
  dbInsertTargetGroupDetail,
  dbPatchTargetGroup,
  dbTargetGroupDetail,
} from '../db/target-groups'

export type SeedVaillantGroupMafoTargetGroupsResult = {
  projectId: string
  created: string[]
  updated: string[]
  skipped: string[]
}

function sameStringList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

async function seedToDetail(seed: VaillantGroupTargetGroupSeed): Promise<TargetGroupDetail> {
  const linkedPersonas = await dbPersonaSummariesByIds(seed.linkedPersonaIds)
  const now = new Date().toISOString()
  return {
    id: seed.id,
    name: seed.name,
    segment: seed.segmentKey,
    description: seed.description,
    status: 'active',
    personaCount: linkedPersonas.length,
    projectId: VAILLANT_GROUP_AUDION_PROJECT_ID,
    updatedAt: now,
    linkedPersonas,
    knowledgeEntries: [],
    documents: [],
  }
}

function needsPatch(
  existing: TargetGroupDetail,
  seed: VaillantGroupTargetGroupSeed,
): boolean {
  const existingIds = existing.linkedPersonas.map((p) => p.id)
  return (
    existing.projectId !== VAILLANT_GROUP_AUDION_PROJECT_ID ||
    existing.segment !== seed.segmentKey ||
    existing.name !== seed.name ||
    existing.description !== seed.description ||
    !sameStringList(existingIds, seed.linkedPersonaIds)
  )
}

export async function seedVaillantGroupMafoTargetGroups(): Promise<SeedVaillantGroupMafoTargetGroupsResult> {
  const created: string[] = []
  const updated: string[] = []
  const skipped: string[] = []

  for (const seed of VAILLANT_GROUP_ALL_MAFO_TARGET_GROUPS) {
    const existing = await dbTargetGroupDetail(seed.id)
    if (!existing) {
      await dbInsertTargetGroupDetail(await seedToDetail(seed))
      created.push(seed.id)
      continue
    }

    if (!needsPatch(existing, seed)) {
      skipped.push(seed.id)
      continue
    }

    await dbPatchTargetGroup(seed.id, {
      name: seed.name,
      segment: seed.segmentKey,
      description: seed.description,
      status: 'active',
      projectId: VAILLANT_GROUP_AUDION_PROJECT_ID,
      linkedPersonaIds: seed.linkedPersonaIds,
    })
    updated.push(seed.id)
  }

  return {
    projectId: VAILLANT_GROUP_AUDION_PROJECT_ID,
    created,
    updated,
    skipped,
  }
}
