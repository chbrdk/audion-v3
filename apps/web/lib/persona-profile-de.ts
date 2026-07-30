import type { PersonaDetail, PersonaProfileDe } from '@audion-v3/contracts'

/** Prefer DE mirror when locale is German and profileDe has content; EN remains canonical store. */
export function resolvePersonaHeadline(
  persona: Pick<PersonaDetail, 'role' | 'headlineDe' | 'profileDe'>,
  locale: string,
): string {
  if (locale.startsWith('de')) {
    const de = persona.headlineDe?.trim() || persona.profileDe?.headline?.trim()
    if (de) return de
  }
  return persona.role
}

export function resolvePersonaBio(
  persona: Pick<PersonaDetail, 'bio' | 'profileDe'>,
  locale: string,
): string | null {
  if (locale.startsWith('de')) {
    const de = persona.profileDe?.bio?.trim()
    if (de) return de
  }
  return persona.bio
}

export function hasPersonaProfileDe(profileDe: PersonaProfileDe | null | undefined): boolean {
  if (!profileDe) return false
  return Boolean(
    profileDe.headline?.trim() ||
      profileDe.bio?.trim() ||
      (profileDe.interests && profileDe.interests.length) ||
      (profileDe.values && profileDe.values.length),
  )
}
