import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TargetGroupDetailPanel } from '../components/target-group-detail-panel'
import { DEMO_TARGET_GROUPS } from '../lib/fixtures/target-groups'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  usePathname: () => '/target-groups/tg-digital-product-leads',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe('TargetGroupDetailPanel hero', () => {
  it('uses full-width text hero like projects (no portrait column)', () => {
    const { container } = render(
      <TargetGroupDetailPanel
        targetGroup={DEMO_TARGET_GROUPS[0]!}
        project={{ id: 'proj-audion-core', name: 'AUDION Core' }}
      />,
    )
    const hero = container.querySelector('.audion-magazine-hero')
    expect(hero?.classList.contains('audion-magazine-hero--text')).toBe(true)
    expect(screen.getByRole('heading', { name: 'Digital Product Leads' })).toBeTruthy()
    expect(container.querySelector('.audion-magazine-portrait')).toBeNull()
  })

  it('shows project facet linking to the Collection', () => {
    render(
      <TargetGroupDetailPanel
        targetGroup={DEMO_TARGET_GROUPS[0]!}
        project={{ id: 'proj-audion-core', name: 'AUDION Core' }}
      />,
    )
    const link = screen.getByRole('link', { name: 'AUDION Core' })
    expect(link).toHaveAttribute('href', paths.routes.projectDetail('proj-audion-core'))
  })

  it('links Ask all personas to TG chat', () => {
    render(<TargetGroupDetailPanel targetGroup={DEMO_TARGET_GROUPS[0]!} />)
    const link = screen.getByRole('link', { name: /Ask all personas/i })
    expect(link).toHaveAttribute(
      'href',
      paths.routes.chatTargetGroup(DEMO_TARGET_GROUPS[0]!.id),
    )
  })
})

describe('TargetGroupDetailPanel linked personas layout', () => {
  it('defaults to cards and switches to numbered list', () => {
    const { container } = render(
      <TargetGroupDetailPanel targetGroup={DEMO_TARGET_GROUPS[0]!} />,
    )

    expect(container.querySelector('.audion-tg-grid--nested')).toBeTruthy()
    expect(container.querySelector('.audion-tg-linked-list')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cards' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: /Add persona/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'List' }))

    expect(container.querySelector('.audion-tg-grid--nested')).toBeNull()
    expect(container.querySelector('.audion-tg-linked-list')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Alex Morgan/i })).toBeTruthy()
    expect(sessionStorage.getItem(paths.tgLinkedPersonasLayoutKey)).toBe('list')
  })

  it('shows Add persona when no personas are linked', () => {
    const empty = {
      ...DEMO_TARGET_GROUPS[0]!,
      linkedPersonas: [],
      personaCount: 0,
    }
    render(<TargetGroupDetailPanel targetGroup={empty} />)
    expect(screen.getByText(/No personas linked yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add persona/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ask all personas/i })).toBeNull()
  })

  it('restores list layout from sessionStorage', () => {
    sessionStorage.setItem(paths.tgLinkedPersonasLayoutKey, 'list')
    const { container } = render(
      <TargetGroupDetailPanel targetGroup={DEMO_TARGET_GROUPS[0]!} />,
    )
    expect(container.querySelector('.audion-tg-linked-list')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'List' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })
})
