import { describe, expect, it } from 'vitest'
import {
  VAILLANT_GROUP_ALL_MAFO_PERSONAS,
  VAILLANT_GROUP_ALL_MAFO_TARGET_GROUPS,
  VAILLANT_GROUP_AUDION_PROJECT_ID,
  VAILLANT_GROUP_PLATFORM_PROJECT_ID,
  VAILLANT_GROUP_UC1_PERSONAS,
  VAILLANT_GROUP_UC2_INSTALLER_PERSONAS,
  VAILLANT_GROUP_UC1_TARGET_GROUPS,
  VAILLANT_GROUP_UC2_TARGET_GROUPS,
} from '../lib/fixtures/vaillant-group-mafo-seed'

describe('vaillant group mafo seed', () => {
  it('binds personas to Vaillant Group audion mirror only', () => {
    expect(VAILLANT_GROUP_PLATFORM_PROJECT_ID).toBe(
      'f3d27e9f-d14c-4880-82be-3ca31c051173',
    )
    for (const p of VAILLANT_GROUP_ALL_MAFO_PERSONAS) {
      expect(p.projectId).toBe(VAILLANT_GROUP_AUDION_PROJECT_ID)
    }
    expect(VAILLANT_GROUP_UC1_PERSONAS).toHaveLength(6)
    expect(VAILLANT_GROUP_UC2_INSTALLER_PERSONAS).toHaveLength(3)
    expect(VAILLANT_GROUP_ALL_MAFO_PERSONAS).toHaveLength(9)
    expect(VAILLANT_GROUP_UC1_TARGET_GROUPS).toHaveLength(6)
    expect(VAILLANT_GROUP_UC2_TARGET_GROUPS).toHaveLength(2)
    expect(VAILLANT_GROUP_ALL_MAFO_TARGET_GROUPS).toHaveLength(8)
  })

  it('links each UC1 target group to exactly one persona', () => {
    for (const tg of VAILLANT_GROUP_UC1_TARGET_GROUPS) {
      expect(tg.linkedPersonaIds).toHaveLength(1)
      expect(VAILLANT_GROUP_UC1_PERSONAS.some((p) => p.id === tg.linkedPersonaIds[0])).toBe(true)
    }
  })

  it('links UC2 target groups to homeowner and installer personas', () => {
    const homeowner = VAILLANT_GROUP_UC2_TARGET_GROUPS.find(
      (tg) => tg.segmentKey === 'homeowner_decision',
    )
    const installer = VAILLANT_GROUP_UC2_TARGET_GROUPS.find(
      (tg) => tg.segmentKey === 'installer_recommendation',
    )
    expect(homeowner?.linkedPersonaIds).toHaveLength(6)
    expect(installer?.linkedPersonaIds).toHaveLength(3)
  })
})
