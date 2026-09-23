import { describe, expect, it } from 'vitest'
import {
  allocateUniqueSlug,
  ensureEntitySlug,
  entityRouteKey,
  slugifyName,
} from '../lib/entity-slug'
import {
  resetPersonaStore,
  storeCreatePersona,
  storePatchPersona,
  storePersonaDetail,
} from '../lib/fixtures/persona-store'
import {
  resetTargetGroupStore,
  storeCreateTargetGroup,
  storePatchTargetGroup,
  storeTargetGroupDetail,
} from '../lib/fixtures/target-group-store'

describe('entity-slug helpers', () => {
  it('slugifies names', () => {
    expect(slugifyName('Alex Morgan')).toBe('alex-morgan')
    expect(slugifyName('  ÜDG  Team!! ')).toBe('udg-team')
  })

  it('allocates unique slugs with numeric suffixes', () => {
    expect(allocateUniqueSlug('Alex', ['alex'])).toBe('alex-2')
    expect(allocateUniqueSlug('Alex', ['alex', 'alex-2'])).toBe('alex-3')
    expect(allocateUniqueSlug('Alex', ['alex'], 'alex')).toBe('alex')
  })

  it('entityRouteKey prefers slug', () => {
    expect(entityRouteKey({ id: 'persona-1', slug: 'alex' })).toBe('alex')
    expect(entityRouteKey({ id: 'persona-1', slug: null })).toBe('persona-1')
  })
})

describe('persona slug on rename', () => {
  it('sets slug on create and updates slug when name changes', async () => {
    resetPersonaStore()
    const created = await storeCreatePersona({
      name: 'Zelda Unique Rename',
      role: 'PM',
      projectId: 'proj-1',
    })
    expect(created.slug).toBe('zelda-unique-rename')
    expect(await storePersonaDetail('zelda-unique-rename')).toMatchObject({ id: created.id })

    const renamed = await storePatchPersona(created.id, { name: 'Link Unique Rename' })
    expect(renamed?.slug).toBe('link-unique-rename')
    expect(renamed?.id).toBe(created.id)
    expect(await storePersonaDetail(created.id)).toMatchObject({ slug: 'link-unique-rename' })
    expect(await storePersonaDetail('link-unique-rename')).toMatchObject({ id: created.id })
    expect(await storePersonaDetail('zelda-unique-rename')).toBeNull()
  })
})

describe('target group slug on rename', () => {
  it('sets slug on create and updates slug when name changes', async () => {
    resetTargetGroupStore()
    const created = await storeCreateTargetGroup({
      name: 'Zelda Unique TG',
      segment: 'B2B',
      projectId: 'proj-1',
    })
    expect(created.slug).toBe('zelda-unique-tg')

    const renamed = await storePatchTargetGroup(created.id, { name: 'Link Unique TG' })
    expect(renamed?.slug).toBe('link-unique-tg')
    expect(renamed?.id).toBe(created.id)
    expect(await storeTargetGroupDetail('link-unique-tg')).toMatchObject({ id: created.id })
    expect(await storeTargetGroupDetail('zelda-unique-tg')).toBeNull()
  })
})

describe('ensureEntitySlug', () => {
  it('fills missing slug from name', () => {
    expect(ensureEntitySlug({ id: 'x', name: 'Hello World' }).slug).toBe('hello-world')
  })
})
