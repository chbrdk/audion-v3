'use client'

import React from 'react'
import { UserPrefsProvider } from '../lib/user-prefs'

/** Client providers for prefs / theme (wraps server layout children). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return <UserPrefsProvider>{children}</UserPrefsProvider>
}
