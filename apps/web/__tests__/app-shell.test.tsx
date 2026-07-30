import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppShell } from '../components/app-shell'
import { UserPrefsProvider } from '../lib/user-prefs'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  usePathname: () => '/personas',
}))

function renderShell(ui: React.ReactElement) {
  return render(<UserPrefsProvider>{ui}</UserPrefsProvider>)
}

describe('app shell', () => {
  it('renders brand, floating navigation, and page title', () => {
    renderShell(
      <AppShell title="Persona Workspace" description="Manage personas.">
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
    expect(screen.getByRole('link', { name: /Chat/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute(
      'href',
      paths.routes.settings,
    )
    expect(screen.getByText('Persona Workspace')).toBeInTheDocument()
  })

  it('renders a quiet context title that can link out', () => {
    renderShell(
      <AppShell
        title="Digital Product Leads"
        titleTone="context"
        titleHref="/target-groups/tg-digital-product-leads"
      >
        <div>Content</div>
      </AppShell>,
    )

    const title = screen.getByRole('heading', { name: 'Digital Product Leads' })
    expect(title).toHaveClass('audion-page-title--context')
    expect(screen.getByRole('link', { name: 'Digital Product Leads' })).toHaveAttribute(
      'href',
      '/target-groups/tg-digital-product-leads',
    )
  })

  it('can replace the title with a leading slot', () => {
    renderShell(
      <AppShell leading={<label htmlFor="x">Persona</label>} actions={<a href="/chat/history">History</a>}>
        <div>Content</div>
      </AppShell>,
    )
    expect(document.querySelector('.topbar-brand')?.textContent).toContain('Persona')
    expect(document.querySelector('.ds-page-title')).toBeNull()
    expect(screen.getByRole('link', { name: 'History' })).toBeInTheDocument()
  })
})
