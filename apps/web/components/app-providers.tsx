'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import { UserPrefsProvider } from '../lib/user-prefs'

/** Client providers for session + prefs / theme (wraps server layout children). */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserPrefsProvider>{children}</UserPrefsProvider>
    </SessionProvider>
  )
}
