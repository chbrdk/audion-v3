import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paths } from '../lib/paths'

const repoRoot = resolve(__dirname, '../../..')

describe('Dockerfile Coolify packaging', () => {
  it('ships Dockerfile and dockerignore at repo root', () => {
    expect(existsSync(resolve(repoRoot, 'Dockerfile'))).toBe(true)
    expect(existsSync(resolve(repoRoot, '.dockerignore'))).toBe(true)
  })

  it('documents staging domain and clones msqdx-ui', () => {
    const df = readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8')
    expect(df).toContain('audion-v3.projects-a.plygrnd.tech')
    expect(df).toContain('msqdx-ui')
    expect(df).toContain('node-linker=hoisted')
    expect(df).toContain('EXPOSE 3000')
    expect(df).toContain('docker-entrypoint.sh')
    expect(df).toContain('apps/web/drizzle.config.ts')
    expect(df).toMatch(/docker-entrypoint\.sh|npm run start -w web/)
  })

  it('points webpack at workspace node_modules for sibling DS deps', () => {
    const cfg = readFileSync(resolve(repoRoot, 'apps/web/next.config.ts'), 'utf8')
    expect(cfg).toContain('workspaceNodeModules')
    expect(cfg).toContain('config.resolve.modules')
  })

  it('keeps health path for Traefik probes', () => {
    expect(paths.routes.apiHealth).toBe('/api/health')
  })
})
