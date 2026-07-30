'use client'

import React from 'react'
import type { PersonaDetail } from '@audion-v3/contracts'
import { Text } from '@msqdx/ui'
import { resolvePersonaBio, resolvePersonaHeadline } from '../lib/persona-profile-de'
import { useUserPrefs } from '../lib/user-prefs'

/** Locale-aware deck + lede (DE mirror when locale is German). */
export function PersonaLocalizedHeroCopy({
  persona,
}: {
  persona: Pick<PersonaDetail, 'role' | 'bio' | 'headlineDe' | 'profileDe'>
}) {
  const { locale } = useUserPrefs()
  const headline = resolvePersonaHeadline(persona, locale)
  const bio = resolvePersonaBio(persona, locale)

  return (
    <>
      <Text role="body" className="audion-magazine-deck">
        {headline}
      </Text>
      {bio ? <p className="audion-magazine-lede ds-motion-reveal">{bio}</p> : null}
    </>
  )
}
