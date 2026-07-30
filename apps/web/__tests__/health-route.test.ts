import { describe, expect, it } from 'vitest'
import { GET } from '../app/api/health/route'
import { paths } from '../lib/paths'

describe('api health', () => {
  it('exposes Coolify probe path and ok payload', async () => {
    expect(paths.routes.apiHealth).toBe('/api/health')
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      service: 'audion-v3',
      login: paths.routes.login,
    })
  })
})
