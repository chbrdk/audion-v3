import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('links to providers, prompts, and api-docs', () => {
    render(<SettingsAdminHubPanel />)
    expect(screen.getByRole('link', { name: /Providers/i }).getAttribute('href')).toBe(
      paths.routes.settingsAdminProviders,
    )
    expect(screen.getByRole('link', { name: /Prompts/i }).getAttribute('href')).toBe(
      paths.routes.settingsAdminPrompts,
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

  it('loads templates and shows stub test result', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
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
                user: 'user body',
                prompt: 'PROMPT ${max_items}',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url === paths.routes.apiSettingsPromptTest && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            stubbed: true,
            templateId: 'persona.interests',
            text: '{"items":[{"title":"Stub suggestion"}]}',
            json: { items: [{ title: 'Stub suggestion' }] },
            suggestions: [{ id: 's1', title: 'Stub suggestion' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (url.includes('/api/settings/prompts/persona.interests') && init?.method === 'PUT') {
        return new Response(
          JSON.stringify({
            id: 'persona.interests',
            label: 'Interests',
            description: 'desc',
            category: 'persona',
            json: true,
            overridden: true,
            system: 'sys',
            user: 'saved',
            prompt: 'saved',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<SettingsAdminPromptsPanel />)
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-prompt-test')).toBeTruthy()
    })
    expect(screen.getByTestId('settings-admin-prompt-body')).toBeTruthy()
    fireEvent.click(screen.getByTestId('settings-admin-prompt-test'))
    await waitFor(() => {
      expect(screen.getByTestId('settings-admin-prompt-result')).toBeTruthy()
    })
    expect(screen.getByTestId('settings-admin-prompt-result').textContent).toMatch(/Stubbed/i)
  })
})
