'use client'

import React from 'react'
import type { PersonaDetail } from '@audion-v3/contracts'
import { SectionChrome, Text } from '@msqdx/ui'
import { hasPersonaProfileDe } from '../lib/persona-profile-de'
import { useUserPrefs } from '../lib/user-prefs'

/** Magazine band for bilingual DE mirror (EN remains canonical). Shown when locale is de or profileDe exists. */
export function PersonaProfileDeBand({ persona }: { persona: PersonaDetail }) {
  const { locale } = useUserPrefs()
  const profile = persona.profileDe
  if (!hasPersonaProfileDe(profile) && !persona.headlineDe) return null

  const showAsPrimary = locale.startsWith('de')
  // When DE is primary, hero already resolves DE copy — skip duplicate band.
  if (showAsPrimary) return null
  if (!profile && !persona.headlineDe) return null

  return (
    <section
      className="detail-block audion-persona-profile-de ds-motion-reveal"
      aria-label="German profile"
    >
      <SectionChrome
        quiet
        title="German mirror"
        meta="DE"
        metaTone="accent"
        as="h3"
      />
      {persona.headlineDe || profile?.headline ? (
        <Text role="body" className="audion-magazine-deck">
          {persona.headlineDe || profile?.headline}
        </Text>
      ) : null}
      {profile?.bio ? <p className="audion-magazine-lede">{profile.bio}</p> : null}
      {profile?.interests?.length ? (
        <p className="audion-edit-lede">
          Interessen: {profile.interests.join(' · ')}
        </p>
      ) : null}
      {profile?.values?.length ? (
        <p className="audion-edit-lede">Werte: {profile.values.join(' · ')}</p>
      ) : null}
    </section>
  )
}
