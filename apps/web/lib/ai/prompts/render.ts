/**
 * Assist prompt variable substitution + locale guard (V2 AiAssist parity).
 * Spec: specs/domain/prompt-templating.md
 */

export function normalizeOutputLocale(value: string | null | undefined): 'en' | 'de' {
  const s = String(value ?? '').trim().toLowerCase()
  if (!s) return 'en'
  if (s === 'en' || s === 'english' || s === 'en-us' || s === 'en-gb') return 'en'
  return 'de'
}

export function localeLabelForAiPrompt(normalized: 'en' | 'de'): string {
  return normalized === 'en' ? 'English' : 'German'
}

/** Ensure output_locale + generated_text_locale_name (+ locale alias). */
export function finalizeAssistVars(vars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...vars }
  const raw =
    out.output_locale ||
    out.locale ||
    out.ui_locale ||
    (out.generated_text_locale_name?.toLowerCase().includes('german') ? 'de' : '') ||
    (out.generated_text_locale_name?.toLowerCase().includes('english') ? 'en' : '')
  const loc = normalizeOutputLocale(raw || 'en')
  out.output_locale = loc
  out.locale = loc
  out.generated_text_locale_name = localeLabelForAiPrompt(loc)
  return out
}

/**
 * Substitute `${name}` and `{{name}}`. Missing keys → empty string (safe_substitute).
 * Does not resolve extended `${entity:${id}.path}` forms — leave them unsubstituted.
 */
export function substituteVars(text: string, vars: Record<string, string>): string {
  const safe = finalizeAssistVars(vars)
  // Skip nested/extended forms: ${persona:${id}.x} — leave as-is for now
  let out = text.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_m, key: string) => {
    return Object.prototype.hasOwnProperty.call(safe, key) ? String(safe[key] ?? '') : ''
  })
  out = out.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_m, key: string) => {
    return Object.prototype.hasOwnProperty.call(safe, key) ? String(safe[key] ?? '') : ''
  })
  return out
}

export function localeOutputGuardFooter(outputLocale: string | null | undefined): string {
  const loc = normalizeOutputLocale(outputLocale)
  if (loc === 'en') {
    return (
      '\n\n---\nCRITICAL OUTPUT LANGUAGE — ENGLISH: Every user-visible string you output ' +
      '(including JSON field values for titles, descriptions, names, list items) must be written ' +
      'exclusively in English. Do not use German or other languages. Keep JSON property keys exactly ' +
      'as required by the schema.'
    )
  }
  return (
    '\n\n---\nKRITISCH — AUSGABESPRACHE DEUTSCH: Jeder nutzerlesbare Text, den du ausgibst ' +
    '(einschließlich JSON-Werte für Titel, Beschreibungen, Namen, Aufzählungen) muss ausschließlich ' +
    'auf Deutsch (Hochdeutsch) formuliert sein. Kein Englisch in diesen Werten. JSON-Eigenschaftsnamen ' +
    'unverändert wie im Schema vorgegeben.'
  )
}

export function appendLocaleOutputGuard(
  renderedPrompt: string,
  outputLocale: string | null | undefined,
): string {
  return String(renderedPrompt) + localeOutputGuardFooter(outputLocale)
}
