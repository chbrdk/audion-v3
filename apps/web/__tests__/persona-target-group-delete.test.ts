import { beforeEach, describe, expect, it } from 'vitest'
import {
  storeCreatePersona,
  storeDeletePersona,
  storePersonaList,
  resetPersonaStore,
} from '../lib/fixtures/persona-store'
import {
  storeCreateTargetGroup,
  storeDeleteTargetGroup,
  storePatchTargetGroup,
  storeTargetGroupDetail,
  storeTargetGroupList,
  resetTargetGroupStore,
} from '../lib/fixtures/target-group-store'

describe('persona / target-group hard delete', () => {
  beforeEach(() => {
    resetPersonaStore()
    resetTargetGroupStore()
  })

  it('deletes a persona and unlinks it from target groups', async () => {
    const persona = await storeCreatePersona({
      name: 'Delete Me',
      role: 'Buyer',
      status: 'draft',
    })
    const tg = await storeCreateTargetGroup({
      name: 'Segment',
      segment: 'B2B',
      status: 'draft',
      linkedPersonaIds: [persona.id],
    })
    expect((await storeTargetGroupDetail(tg.id))?.linkedPersonas.map((p) => p.id)).toContain(
      persona.id,
    )

    expect(await storeDeletePersona(persona.id)).toBe(true)
    expect((await storePersonaList()).items.find((p) => p.id === persona.id)).toBeUndefined()
    expect((await storeTargetGroupDetail(tg.id))?.linkedPersonas.map((p) => p.id)).not.toContain(
      persona.id,
    )
  })

  it('deletes a target group without removing personas', async () => {
    const persona = await storeCreatePersona({
      name: 'Keep Me',
      role: 'Buyer',
      status: 'draft',
    })
    const tg = await storeCreateTargetGroup({
      name: 'Drop Me',
      segment: 'B2C',
      status: 'draft',
      linkedPersonaIds: [persona.id],
    })
    await storePatchTargetGroup(tg.id, { linkedPersonaIds: [persona.id] })

    expect(await storeDeleteTargetGroup(tg.id)).toBe(true)
    expect((await storeTargetGroupList()).items.find((g) => g.id === tg.id)).toBeUndefined()
    expect((await storePersonaList()).items.find((p) => p.id === persona.id)?.name).toBe('Keep Me')
  })
})
