# Settings

**Status:** Accepted — 2026-07-30 · MVP + Plexon Account Wave 1 · **SET-L1 locale chrome**  
**Route:** `/settings`  
**Knowledge:** `knowledge/settings-migration.md`, `knowledge/paths.md`, `knowledge/plexon-federation.md`, `knowledge/i18n.md`  
**Reference:** ECHON v3 `SettingsPage` + `UserPrefsContext` · checkion-v3 / brandion-v3 SET-L1

## Purpose

Device-local user prefs (display name, theme, locale) plus optional Plexon Account band when a session exists.

## Locale (SET-L1)

WHEN the author changes Language in Settings, AUDION SHALL store `paths.localeStorageKey` (`en` | `de`) and set `document.documentElement.lang`.  
WHEN locale is `de` or `en`, shell chrome, page titles/leads, settings, login, hub list chrome, create/edit dialogs, chat chrome (incl. tool-approval / guest budget / inspect), easy setup, queue, detail magazine section titles, Soft-Q/wave section chrome, UX flow canvas + inspector, Prompt Builder, persona editable subpanel chrome, journey phases, knowledge dossier, and admin API docs SHALL render via `t(key)` dictionaries (`apps/web/locales/{en,de}.json`) through `useUserPrefs().t` / `useT()`.  
Persona **content** locale (`profileDe`, AI `output_locale`) remains separate from UI chrome.  
Default locale is `en`. No URL/`[locale]` routing or next-intl.

## Composition

| Band | Treatment |
|------|-----------|
| Account | When authenticated: Plexon name/email (read) + Sign out. When unauthenticated: Sign in link |
| Profile | `Avatar` + display name `Input` (localStorage); may seed from session name |
| Appearance | Theme `ToggleGroup` → `data-theme` + storage |
| Language | Locale `ToggleGroup` (`en` / `de`) — drives UI chrome via SET-L1 |

## Shell

- Rail footer avatar enabled → `paths.routes.settings`
- Active on `/settings*`
- Initials from display name
- Rail labels from `nav.*` dictionary keys

## Non-goals (MVP)

Providers, API docs iframe, password/tokens, brand color, PATCH profile to Plexon (Wave 1 read + logout only)

Admin prompts / providers live under `/settings/admin` (see `specs/domain/prompt-templating.md`).

Rare dim-hints, mock-context microcopy, and dynamic API error passthrough may remain untranslated — out of SET-L1 acceptance.

## Acceptance

1. Prefs survive reload via `paths.*StorageKey`.
2. Theme applies to `<html data-theme>`.
3. Settings link not disabled; tests cover shell + page.
4. Authenticated session shows Account + Sign out; unauthenticated shows Sign in → `/login`.
5. Language `de` switches rail + settings chrome to German; `en` restores English.
6. `en.json` / `de.json` key trees stay in parity (test).
