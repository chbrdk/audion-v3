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
    expect(df).toContain('MSQDX_UI_REF=')
    expect(df).toMatch(/git fetch --depth 1 origin "\$\{MSQDX_UI_REF\}"/)
    expect(df).toContain('node-linker=hoisted')
    expect(df).toContain('ChatOverlay.tsx')
    expect(df).toContain('EXPOSE 3000')
    expect(df).toContain('docker-entrypoint.sh')
    expect(df).toMatch(/find \. -type d -name node_modules/)
    expect(df).toMatch(
      /ln -s \/workspace\/audion-v3\/node_modules \/workspace\/msqdx-ui\/node_modules/,
    )
    expect(df).toContain('apps/web/drizzle.config.ts')
    expect(df).toMatch(/docker-entrypoint\.sh|npm run start -w web/)
  })

  it('pins msqdx-ui to a full commit SHA (busts stale Coolify ds cache)', () => {
    const df = readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8')
    const match = df.match(/ARG MSQDX_UI_REF=([0-9a-f]{40})/)
    expect(match?.[1]).toMatch(/^[0-9a-f]{40}$/)
  })

  it('points webpack at workspace node_modules for sibling DS deps', () => {
    const cfg = readFileSync(resolve(repoRoot, 'apps/web/next.config.ts'), 'utf8')
    expect(cfg).toContain('workspaceNodeModules')
    expect(cfg).toContain('config.resolve.modules')
  })

  it('re-exports ChatOverlay from the client @msqdx/ui barrel', () => {
    const client = readFileSync(resolve(repoRoot, 'apps/web/lib/msqdx-ui-client.ts'), 'utf8')
    expect(client).toContain("'use client'")
    expect(client).toContain('ChatOverlay')
  })

  it('keeps health path for Traefik probes', () => {
    expect(paths.routes.apiHealth).toBe('/api/health')
  })
})
