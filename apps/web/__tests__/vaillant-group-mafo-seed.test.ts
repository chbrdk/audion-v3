import { describe, expect, it } from 'vitest'
import {
  VAILLANT_GROUP_AUDION_PROJECT_ID,
  VAILLANT_GROUP_PLATFORM_PROJECT_ID,
  VAILLANT_GROUP_UC1_PERSONAS,
  VAILLANT_GROUP_UC1_TARGET_GROUPS,
} from '../lib/fixtures/vaillant-group-mafo-seed'

describe('vaillant group mafo seed', () => {
  it('binds personas to Vaillant Group audion mirror only', () => {
    expect(VAILLANT_GROUP_PLATFORM_PROJECT_ID).toBe(
      'f3d27e9f-d14c-4880-82be-3ca31c051173',
    )
    for (const p of VAILLANT_GROUP_UC1_PERSONAS) {
      expect(p.projectId).toBe(VAILLANT_GROUP_AUDION_PROJECT_ID)
    }
    expect(VAILLANT_GROUP_UC1_PERSONAS).toHaveLength(6)
    expect(VAILLANT_GROUP_UC1_TARGET_GROUPS).toHaveLength(6)
  })
})
