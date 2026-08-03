import { afterEach, describe, expect, it } from 'vitest'
import { GET, PATCH } from '../app/api/projects/[projectId]/route'
import {
  resetProjectStore,
  storeCreateProject,
} from '../lib/fixtures/project-store'

describe('GET /api/projects/:projectId', () => {
  afterEach(() => {
    resetProjectStore()
  })

  it('returns project detail', async () => {
    const created = await storeCreateProject({ name: 'Bosch eBike' })
    const res = await GET(new Request('http://localhost/api/projects/x'), {
      params: Promise.resolve({ projectId: created.id }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(created.id)
    expect(body.name).toBe('Bosch eBike')
  })

  it('returns 404 for unknown id', async () => {
    const res = await GET(new Request('http://localhost/api/projects/missing'), {
      params: Promise.resolve({ projectId: 'proj-missing' }),
    })
    expect(res.status).toBe(404)
  })

  it('PATCH still updates fields', async () => {
    const created = await storeCreateProject({ name: 'Bosch eBike' })
    const res = await PATCH(
      new Request('http://localhost/api/projects/x', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'updated' }),
      }),
      { params: Promise.resolve({ projectId: created.id }) },
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.description).toBe('updated')
  })
})
