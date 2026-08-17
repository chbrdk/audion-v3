import { paths } from '../paths'

export type TavusLanguageCode = (typeof paths.tavusLanguageChoices)[number]

export type TavusLanguageSource = {
  tavusLanguage?: string | null
  bio?: string | null
  location?: string | null
  headlineDe?: string | null
  profileDe?: { bio?: string | null; headline?: string | null } | null
}

/** Audion stores `de` / `en`. Accept German/English aliases from older payloads. */
export function parseTavusLanguage(value: unknown): TavusLanguageCode | null {
  if (typeof value !== 'string') return null
  const raw = value.trim().toLowerCase()
  if (raw === 'de' || raw === 'german' || raw === 'deutsch') return 'de'
  if (raw === 'en' || raw === 'english' || raw === 'englisch') return 'en'
  return null
}

export function inferTavusLanguage(persona: TavusLanguageSource): TavusLanguageCode {
  const haystack = [
    persona.bio,
    persona.location,
    persona.headlineDe,
    persona.profileDe?.bio,
    persona.profileDe?.headline,
  ]
    .filter(Boolean)
    .join(' ')
  return /[äöüÄÖÜß]|deutschland|germany|österreich|schweiz/i.test(haystack) ? 'de' : 'en'
}

/** Explicit magazine choice wins; otherwise infer from bio/location. */
export function resolveTavusLanguage(persona: TavusLanguageSource): TavusLanguageCode {
  return parseTavusLanguage(persona.tavusLanguage) ?? inferTavusLanguage(persona)
}

/** Tavus Create Conversation requires the full language name, not `de`/`en`. */
export function tavusConversationLanguageName(code: TavusLanguageCode): string {
  return paths.tavusLanguageNames[code]
}

export function tavusSpokenLanguageRule(code: TavusLanguageCode): string {
  return code === 'de'
    ? '- Speak German. Stay in German unless the user clearly switches.'
    : '- Speak English. Stay in English unless the user clearly switches.'
}
