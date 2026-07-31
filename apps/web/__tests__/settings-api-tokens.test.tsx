import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { SettingsAdminTokensPanel } from '../components/settings-admin-tokens-panel'
import {
  createApiTokenForOwner,
  listApiTokensForOwner,
  revokeApiTokenForOwner,
  toApiTokenOwnerId,
  verifyApiTokenBearer,
} from '../lib/settings-api-tokens'
import { resetApiTokensStore } from '../lib/fixtures/api-tokens-store'
import { paths } from '../lib/paths'

describe('settings api tokens lib', () => {
  afterEach(() => {
    resetApiTokensStore()
  })

  it('uses fixture owner when no session', () => {
    expect(toApiTokenOwnerId(null)).toBe(paths.apiTokenFixtureOwnerId)
    expect(toApiTokenOwnerId({ id: 'u-1' })).toBe('u-1')
  })

  it('creates hashed token, lists without secret, verifies, revokes', () => {
    const owner = paths.apiTokenFixtureOwnerId
    const created = createApiTokenForOwner(owner, 'MCP')
    expect(created.token.startsWith(paths.apiTokenPrefix)).toBe(true)
    expect(created.token.length).toBe(paths.apiTokenPrefix.length + paths.apiTokenBytes * 2)
    expect(created.name).toBe('MCP')
    expect(JSON.stringify(listApiTokensForOwner(owner))).not.toContain(created.token)

    const ok = verifyApiTokenBearer(`Bearer ${created.token}`)
    expect('error' in ok).toBe(false)
    if ('error' in ok) return
    expect(ok.ownerId).toBe(owner)
    expect(ok.tokenId).toBe(created.id)

    expect(revokeApiTokenForOwner(created.id, owner)).toEqual({ ok: true })
    expect(listApiTokensForOwner(owner).items).toHaveLength(0)
    expect(verifyApiTokenBearer(created.token)).toEqual({
      error: 'Invalid or missing API token',
      status: 401,
    })
  })

  it('rejects revoke for wrong owner', () => {
    const created = createApiTokenForOwner('owner-a', 'x')
    expect(revokeApiTokenForOwner(created.id, 'owner-b')).toEqual({
      error: 'Token not found or already revoked',
      status: 404,
    })
  })
})

describe('SettingsAdminTokensPanel', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    resetApiTokensStore()
  })

  it('lists and creates a token via API', async () => {
    let items: Array<{ id: string; name: string | null; createdAt: string }> = []
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === paths.routes.apiSettingsTokens && (!init?.method || init.method === 'GET')) {
        return new Response(JSON.stringify({ items }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url === paths.routes.apiSettingsTokens && init?.method === 'POST') {
        const created = {
          id: 'tok-1',
          name: 'Demo',
          createdAt: '2026-07-31T10:00:00.000Z',
          token: `${paths.apiTokenPrefix}${'ab'.repeat(32)}`,
        }
        items = [{ id: created.id, name: created.name, createdAt: created.createdAt }]
        return new Response(JSON.stringify(created), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<SettingsAdminTokensPanel />)
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-token-create')).toBeTruthy()
    })
    fireEvent.change(screen.getByTestId('settings-admin-token-name'), {
      target: { value: 'Demo' },
    })
    fireEvent.click(screen.getByTestId('settings-admin-token-create'))
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-token-secret')).toBeTruthy()
    })
    expect(screen.getByTestId('settings-admin-token-secret').textContent).toMatch(
      new RegExp(`^${paths.apiTokenPrefix}`),
    )
  })
})
