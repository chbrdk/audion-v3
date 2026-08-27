'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createTranslator, type Translator } from './i18n'
import { paths } from './paths'

export type UiThemeId = (typeof paths.themeChoices)[number]
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
  const raw = readStored(paths.themeStorageKey)
  if (raw && (paths.themeChoices as readonly string[]).includes(raw)) {
    return raw as UiThemeId
  }
  return paths.defaultTheme
}

function readLocale(): UiLocaleId {
  const raw = readStored(paths.localeStorageKey)
  if (raw && (paths.localeChoices as readonly string[]).includes(raw)) {
    return raw as UiLocaleId
  }
  return paths.defaultLocale
}

function applyTheme(theme: UiThemeId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

function applyLocale(locale: UiLocaleId) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('lang', locale)
}

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayNameState] = useState(paths.defaultDisplayName)
  const [theme, setThemeState] = useState<UiThemeId>(paths.defaultTheme)
  const [locale, setLocaleState] = useState<UiLocaleId>(paths.defaultLocale)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const nextTheme = readTheme()
    const nextLocale = readLocale()
    setDisplayNameState(readDisplayName())
    setThemeState(nextTheme)
    setLocaleState(nextLocale)
    applyTheme(nextTheme)
    applyLocale(nextLocale)
    setHydrated(true)
  }, [])

  const setDisplayName = useCallback((next: string) => {
    const trimmed = next.trim() || paths.defaultDisplayName
    setDisplayNameState(trimmed)
    writeStored(paths.displayNameStorageKey, trimmed)
  }, [])

  const setTheme = useCallback((next: UiThemeId) => {
    setThemeState(next)
    writeStored(paths.themeStorageKey, next)
    applyTheme(next)
  }, [])

  const setLocale = useCallback((next: UiLocaleId) => {
    setLocaleState(next)
    writeStored(paths.localeStorageKey, next)
    applyLocale(next)
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
