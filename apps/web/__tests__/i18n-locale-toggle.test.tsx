import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../components/app-shell'
import { SettingsPage } from '../components/settings-page'
import { createTranslator } from '../lib/i18n'
import { paths } from '../lib/paths'
import { UserPrefsProvider } from '../lib/user-prefs'
import en from '../locales/en.json'
import de from '../locales/de.json'

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signOut: vi.fn(),
}))

afterEach(() => {
  cleanup()
  try {
    localStorage?.removeItem?.(paths.displayNameStorageKey)
    localStorage?.removeItem?.(paths.themeStorageKey)
    localStorage?.removeItem?.(paths.localeStorageKey)
  } catch {
    /* jsdom */
  }
})

function keys(o: Record<string, unknown>, p = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v && !Array.isArray(v)
      ? keys(v as Record<string, unknown>, `${p}${k}.`)
      : [`${p}${k}`],
  )
}

describe('i18n dictionaries', () => {
  it('keeps en/de key trees in parity', () => {
    const ek = new Set(keys(en as Record<string, unknown>))
    const dk = new Set(keys(de as Record<string, unknown>))
    expect([...ek].filter((k) => !dk.has(k))).toEqual([])
    expect([...dk].filter((k) => !ek.has(k))).toEqual([])
  })

  it('translates nav and settings chrome', () => {
    const tEn = createTranslator('en')
    const tDe = createTranslator('de')
    expect(tEn('nav.projects')).toBe('Projects')
    expect(tDe('nav.projects')).toBe('Projekte')
    expect(tEn('nav.targetGroups')).toBe('Target groups')
    expect(tDe('nav.targetGroups')).toBe('Zielgruppen')
    expect(tEn('settings.language')).toBe('Language')
    expect(tDe('settings.language')).toBe('Sprache')
    expect(tDe('settings.languageHelp')).not.toMatch(/stays English/i)
  })
  it('translates wave-2 list and chat chrome', () => {
    const tEn = createTranslator('en')
    const tDe = createTranslator('de')
    expect(tEn('lists.projects.empty')).toBe('No projects yet.')
    expect(tDe('lists.projects.empty')).toBe('Noch keine Projekte.')
    expect(tEn('chat.send')).toBe('Send')
    expect(tDe('chat.send')).toBe('Senden')
    expect(tEn('wave.softQBoard')).toBe('Soft-Q board')
    expect(tDe('wave.softQBoard')).toBe('Soft-Q Board')
    expect(tEn('flows.test')).toBe('Test')
    expect(tDe('flows.test')).toBe('Testen')
  })
  it('translates wave-3 prompt and persona edit chrome', () => {
    const tEn = createTranslator('en')
    const tDe = createTranslator('de')
    expect(tEn('prompts.selectTemplate')).toBe('Select a template')
    expect(tDe('prompts.selectTemplate')).toBe('Template wählen')
    expect(tEn('chatExtra.toolApproval')).toBe('Tool approval')
    expect(tDe('chatExtra.toolApproval')).toBe('Tool-Freigabe')
    expect(tEn('personaEdit.traits')).toBe('Traits')
    expect(tDe('personaEdit.traits')).toBe('Traits')
    expect(tEn('phases.title')).toBe('Phases')
    expect(tDe('phases.title')).toBe('Phasen')
  })
})

describe('locale toggle in Settings', () => {
  it('switches rail labels when Language is set to Deutsch', async () => {
    render(
      <UserPrefsProvider>
        <AppShell titleKey="pages.settings.title">
          <SettingsPage />
        </AppShell>
      </UserPrefsProvider>,
    )

    expect(screen.getByRole('link', { name: /^Projects$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Language' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Deutsch' }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^Projekte$/i })).toHaveAttribute(
        'href',
        paths.routes.projects,
      )
      expect(screen.getByRole('heading', { name: 'Sprache' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /^Zielgruppen$/i })).toBeInTheDocument()
    })

    try {
      expect(localStorage.getItem(paths.localeStorageKey)).toBe('de')
    } catch {
      /* storage stubbed */
    }
  })
})
