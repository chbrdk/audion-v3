import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPageClient } from '../components/login-page'
import { paths } from '../lib/paths'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}))

afterEach(() => {
  cleanup()
})

describe('login page', () => {
  it('shows unconfigured hint when Plexon env is missing', () => {
    render(<LoginPageClient plexonConfigured={false} />)
    expect(screen.getByRole('heading', { name: /Sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/Plexon auth is not configured/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Continue to app/i })).toHaveAttribute(
      'href',
      paths.routes.home,
    )
  })

  it('renders credentials form when configured', () => {
    render(<LoginPageClient plexonConfigured={true} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument()
  })
})
