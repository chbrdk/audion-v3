'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Avatar, Button, Field, Hint, Input, SectionChrome, Text, ToggleGroup } from '@msqdx/ui'
import { paths } from '../lib/paths'
import { useUserPrefs, type UiLocaleId, type UiThemeId } from '../lib/user-prefs'

const THEME_LABELS: Record<UiThemeId, string> = {
  msqdx: 'Light',
  'msqdx-dark': 'Dark',
  'msqdx-v2': 'V2 light',
  'msqdx-v2-dark': 'V2 dark',
}

const LOCALE_LABELS: Record<UiLocaleId, string> = {
  en: 'English',
  de: 'Deutsch',
}

export function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { displayName, setDisplayName, theme, setTheme, locale, setLocale } = useUserPrefs()
  const [draft, setDraft] = useState(displayName)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setDraft(displayName)
  }, [displayName])

  useEffect(() => {
    const sessionName = session?.user?.name?.trim()
    if (status !== 'authenticated' || !sessionName) return
    if (displayName === paths.defaultDisplayName || !displayName.trim()) {
      setDisplayName(sessionName)
      setDraft(sessionName)
    }
  }, [status, session?.user?.name, displayName, setDisplayName])

  function commitName() {
    setDisplayName(draft)
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await signOut({ redirect: false })
      router.replace(paths.routes.login)
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  const accountEmail = session?.user?.email ?? null
  const accountName = session?.user?.name ?? null

  return (
    <div className="audion-settings">
      <Hint panel>Device-local preferences — theme, language, and how you appear in the rail.</Hint>

      {status === 'authenticated' && accountEmail ? (
        <section className="audion-settings-section">
          <SectionChrome quiet title="Account" as="h2" />
          <Text role="body" className="audion-settings-help">
            Signed in via Plexon. Identity is owned by the platform control plane.
          </Text>
          <dl className="audion-settings-account">
            {accountName ? (
              <>
                <dt>Name</dt>
                <dd>{accountName}</dd>
              </>
            ) : null}
            <dt>Email</dt>
            <dd>{accountEmail}</dd>
          </dl>
          <Button type="button" variant="subtle" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </section>
      ) : status !== 'loading' ? (
        <section className="audion-settings-section">
          <SectionChrome quiet title="Account" as="h2" />
          <Text role="body" className="audion-settings-help">
            No Plexon session. Fixture mode stays open without login when auth env is unset.
          </Text>
          <p className="audion-settings-account-link">
            <Link href={paths.routes.login} className="audion-link">
              Sign in
            </Link>
          </p>
        </section>
      ) : null}

      <section className="audion-settings-section">
        <SectionChrome quiet title="Profile" as="h2" />
        <div className="audion-settings-profile-row">
          <Avatar name={draft.trim() || displayName} size="lg" />
          <Field label="Display name" size="sm">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitName()
                }
              }}
              aria-label="Display name"
              maxLength={40}
              block
            />
          </Field>
        </div>
      </section>

      <section className="audion-settings-section">
        <SectionChrome quiet title="Appearance" as="h2" />
        <Text role="body" className="audion-settings-help">
          Theme applies across the shell.
        </Text>
        <ToggleGroup
          className="theme-toggle"
          aria-label="Theme"
          value={theme}
          onChange={(next) => setTheme(next as UiThemeId)}
          options={paths.themeChoices.map((id) => ({
            value: id,
            label: THEME_LABELS[id],
          }))}
        />
      </section>

      <section className="audion-settings-section">
        <SectionChrome quiet title="Language" as="h2" />
        <Text role="body" className="audion-settings-help">
          Stored for upcoming localization (UI stays English for now).
        </Text>
        <ToggleGroup
          aria-label="Language"
          value={locale}
          onChange={(next) => setLocale(next as UiLocaleId)}
          options={paths.localeChoices.map((id) => ({
            value: id,
            label: LOCALE_LABELS[id],
          }))}
        />
      </section>
    </div>
  )
}
