'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  applyThemePreference,
  migrateLegacyThemeId,
  type ThemePreference,
} from '@msqdx/ui'
import { createTranslator, type Translator } from './i18n'
import { paths } from './paths'

export type UiThemeId = ThemePreference
export type UiLocaleId = (typeof paths.localeChoices)[number]

type UserPrefsContextValue = {
  displayName: string
  setDisplayName: (next: string) => void
  theme: UiThemeId
  setTheme: (next: UiThemeId) => void
  locale: UiLocaleId
  setLocale: (next: UiLocaleId) => void
  t: Translator
}

const UserPrefsContext = createContext<UserPrefsContextValue | null>(null)

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

function readDisplayName(): string {
  const raw = readStored(paths.displayNameStorageKey)
  if (raw && raw.trim()) return raw.trim()
  return paths.defaultDisplayName
}

function readTheme(): UiThemeId {
  return migrateLegacyThemeId(readStored(paths.themeStorageKey))
}

function readLocale(): UiLocaleId {
  const raw = readStored(paths.localeStorageKey)
  if (raw && (paths.localeChoices as readonly string[]).includes(raw)) {
    return raw as UiLocaleId
  }
  return paths.defaultLocale
}

function applyLocale(locale: UiLocaleId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('lang', locale)
}

async function patchRemotePrefs(body: { locale?: string; themePreference?: string }) {
  try {
    await fetch('/api/prefs/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    /* offline / unauthenticated — local cache still applies */
  }
}

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayNameState] = useState<string>(paths.defaultDisplayName)
  const [theme, setThemeState] = useState<UiThemeId>(paths.defaultTheme)
  const [locale, setLocaleState] = useState<UiLocaleId>(paths.defaultLocale)
  const [hydrated, setHydrated] = useState(false)
  const themeCleanup = useRef<(() => void) | undefined>(undefined)

  const paintTheme = useCallback((next: UiThemeId) => {
    themeCleanup.current?.()
    themeCleanup.current = applyThemePreference(next)
  }, [])

  useEffect(() => {
    const nextTheme = readTheme()
    const nextLocale = readLocale()
    setDisplayNameState(readDisplayName())
    setThemeState(nextTheme)
    setLocaleState(nextLocale)
    paintTheme(nextTheme)
    applyLocale(nextLocale)
    setHydrated(true)

    void fetch('/api/prefs/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const user = data?.user
        if (!user) return
        if (typeof user.locale === 'string' && (paths.localeChoices as readonly string[]).includes(user.locale)) {
          const next = user.locale as UiLocaleId
          setLocaleState(next)
          writeStored(paths.localeStorageKey, next)
          applyLocale(next)
        }
        if (user.themePreference != null) {
          const pref = migrateLegacyThemeId(user.themePreference)
          setThemeState(pref)
          writeStored(paths.themeStorageKey, pref)
          paintTheme(pref)
        }
      })
      .catch(() => undefined)

    return () => themeCleanup.current?.()
  }, [paintTheme])

  const setDisplayName = useCallback((next: string) => {
    const trimmed = next.trim() || paths.defaultDisplayName
    setDisplayNameState(trimmed)
    writeStored(paths.displayNameStorageKey, trimmed)
  }, [])

  const setTheme = useCallback(
    (next: UiThemeId) => {
      setThemeState(next)
      writeStored(paths.themeStorageKey, next)
      paintTheme(next)
      void patchRemotePrefs({ themePreference: next })
    },
    [paintTheme],
  )

  const setLocale = useCallback((next: UiLocaleId) => {
    setLocaleState(next)
    writeStored(paths.localeStorageKey, next)
    applyLocale(next)
    void patchRemotePrefs({ locale: next })
  }, [])

  const t = useMemo(() => createTranslator(locale), [locale])

  const value = useMemo(
    () => ({ displayName, setDisplayName, theme, setTheme, locale, setLocale, t }),
    [displayName, setDisplayName, theme, setTheme, locale, setLocale, t],
  )

  return (
    <UserPrefsContext.Provider value={value}>
      <span className="visually-hidden" data-prefs-hydrated={hydrated ? 'true' : 'false'} />
      {children}
    </UserPrefsContext.Provider>
  )
}

export function useUserPrefs(): UserPrefsContextValue {
  const ctx = useContext(UserPrefsContext)
  if (!ctx) {
    throw new Error('useUserPrefs requires UserPrefsProvider')
  }
  return ctx
}

/** Translator — falls back to default locale when outside UserPrefsProvider (tests). */
export function useT(): Translator {
  const ctx = useContext(UserPrefsContext)
  return useMemo(() => ctx?.t ?? createTranslator(paths.defaultLocale), [ctx?.t])
}
