import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '../components/app-shell'
import { UserPrefsProvider } from '../lib/user-prefs'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  usePathname: () => '/personas',
  useRouter: () => ({ back: vi.fn(), forward: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

function renderShell(ui: React.ReactElement) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

describe('app shell', () => {
  it('renders brand and floating navigation without a PageTitle topbar', () => {
    renderShell(
      <AppShell description="Manage personas.">
        <div>Content</div>
      </AppShell>,
    )

    const rail = document.querySelector('.nav-rail')

    expect(screen.getByText('AUDION')).toBeInTheDocument()
    expect(rail).toBeInTheDocument()
    expect(rail).toHaveClass('nav-rail--static-dock')
    expect(rail).toHaveAttribute('data-orientation', 'vertical')
    expect(document.querySelector('.rail-link-avatar')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Personas/i })[0]).toHaveClass('active')
    expect(screen.getByRole('link', { name: /Projects/i })).toHaveAttribute(
      'href',
      paths.routes.projects,
    )
    expect(screen.getByRole('link', { name: /Target groups/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Journeys/i })).toBeInTheDocument()
    const primaryLinks = Array.from(document.querySelectorAll('.nav-rail .rail-link')).map(
      (el) => el.getAttribute('aria-label'),
    )
    expect(primaryLinks[0]).toBe('Chat')
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute(
      'href',
      paths.routes.settings,
    )
    expect(document.querySelector('.ds-page-title')).toBeNull()
    expect(document.querySelector('.topbar')).toBeNull()
    expect(document.querySelector('.audion-stage--flush-top')).toBeTruthy()
    expect(screen.getByText('Manage personas.')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('ignores legacy title props so headlines are not duplicated', () => {
    renderShell(
      <AppShell
        title="Digital Product Leads"
        titleTone="context"
        titleHref="/target-groups/tg-digital-product-leads"
      >
        <div>Content</div>
      </AppShell>,
    )

    expect(screen.queryByRole('heading', { name: 'Digital Product Leads' })).toBeNull()
    expect(document.querySelector('.ds-page-title')).toBeNull()
    expect(document.querySelector('.topbar')).toBeNull()
  })

  it('keeps an optional topbar for leading / actions chrome', () => {
    renderShell(
      <AppShell leading={<label htmlFor="x">Persona</label>} actions={<a href="/chat/history">History</a>}>
        <div>Content</div>
      </AppShell>,
    )
    expect(document.querySelector('.topbar')).toBeTruthy()
    expect(document.querySelector('.topbar-brand')?.textContent).toContain('Persona')
    expect(document.querySelector('.ds-page-title')).toBeNull()
    expect(document.querySelector('.audion-stage--flush-top')).toBeNull()
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
  })
})
