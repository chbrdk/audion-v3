import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsAdminHubPanel } from '../components/settings-admin-hub-panel'
import { SettingsAdminPromptsPanel } from '../components/settings-admin-prompts-panel'
import { SettingsPage } from '../components/settings-page'
import { UserPrefsProvider } from '../lib/user-prefs'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

describe('SettingsAdminHubPanel', () => {
  afterEach(() => cleanup())

  it('links to providers, prompts, tokens, and api-docs', () => {
    render(<SettingsAdminHubPanel />)
    expect(screen.getByRole('link', { name: /Providers/i }).getAttribute('href')).toBe(
      paths.routes.settingsAdminProviders,
    )
    expect(screen.getByRole('link', { name: /Prompts/i }).getAttribute('href')).toBe(
      paths.routes.settingsAdminPrompts,
    )
    expect(screen.getByRole('link', { name: /API tokens/i }).getAttribute('href')).toBe(
      paths.routes.settingsAdminTokens,
    )
    expect(screen.getByRole('link', { name: /API docs/i }).getAttribute('href')).toBe(
      paths.routes.settingsAdminApiDocs,
    )
  })
})

describe('SettingsPage admin entry', () => {
  afterEach(() => cleanup())

  it('links to settings admin hub', () => {
    render(
      <UserPrefsProvider>
        <SettingsPage />
      </UserPrefsProvider>,
    )
    const link = screen.getByRole('link', { name: /Open settings admin/i })
    expect(link.getAttribute('href')).toBe(paths.routes.settingsAdmin)
  })
})

describe('SettingsAdminPromptsPanel', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders Prompt Builder workspace after catalog load', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === paths.routes.apiSettingsPrompts) {
        return new Response(
          JSON.stringify({
            templates: [
              {
                id: 'persona.interests',
                label: 'Interests',
                description: 'desc',
                category: 'persona',
                json: true,
                overridden: false,
                system: 'sys',
                user: 'PROMPT',
                prompt: 'PROMPT',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url === paths.routes.apiSettingsPersonaPrompts) {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<SettingsAdminPromptsPanel />)
    await waitFor(() => {
      expect(screen.getByTestId('prompt-builder-workspace')).toBeTruthy()
      expect(screen.getByTestId('pb-editor')).toBeTruthy()
    })
  })
})
