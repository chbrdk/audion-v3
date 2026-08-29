# Settings

**Status:** Accepted — 2026-07-30 · MVP + Plexon Account Wave 1 · **SET-L1 locale chrome** · **2026-08-28 SettingsShell** · **2026-08-29 polish + accent**  
**Route:** `/settings`  
**Knowledge:** `knowledge/settings-migration.md`, `knowledge/paths.md`, `knowledge/plexon-federation.md`, `knowledge/i18n.md`  
**Reference:** `@msqdx/ui` `SettingsShell` · Plexon `themePreference` / `accentPreference` / `locale`

## Purpose

Dense 2-col `SettingsShell` with device-local display name cache; **locale + themePreference + accentPreference** sync via Plexon profile when authenticated.

## Cross-app prefs

WHEN authenticated, AUDION SHALL hydrate `locale` + `themePreference` + `accentPreference` from Plexon and PATCH on change.  
WHEN Appearance changes, AUDION SHALL use `light` | `dark` | `auto` via `applyThemePreference` and accent ids via `applyAccentPreference` / `AccentSwatchGroup`.  
Local storage caches preferences for first paint; Plexon remains SSOT. No long lede/help copy.

## Locale (SET-L1)

WHEN the author changes Language in Settings, AUDION SHALL store `paths.localeStorageKey` (`en` | `de`), set `document.documentElement.lang`, and PATCH Plexon when a session exists.  
WHEN locale is `de` or `en`, shell chrome, page titles/leads, settings, login, hub list chrome, create/edit dialogs, chat chrome (incl. tool-approval / guest budget / inspect), queue, detail magazine section titles, Soft-Q/wave section chrome, UX flow canvas + inspector, Prompt Builder, persona editable subpanel chrome, journey phases, knowledge dossier, home magazine, and admin API docs SHALL render via `t(key)` dictionaries (`apps/web/locales/{en,de}.json`) through `useUserPrefs().t` / `useT()`.  
Persona **content** locale (`profileDe`, AI `output_locale`) remains separate from UI chrome.  
Default locale is `en`. No URL/`[locale]` routing or next-intl.

## Composition

Mount `SettingsShell` (Account → Profile → Appearance → Language → extras).

| Band | Treatment |
|------|-----------|
| Account | When authenticated: Plexon name/email (read) + Sign out. When unauthenticated: Sign in link |
| Profile | `Avatar` + display name `Input` (localStorage); may seed from session name |
| Appearance | Theme ToggleGroup + AccentSwatchGroup → Plexon |
| Language | Locale `ToggleGroup` (`en` / `de`) — SET-L1 + Plexon |
| Extras | Admin entry → `/settings/admin` |

## Shell

- Rail footer avatar enabled → `paths.routes.settings`
- Active on `/settings*`
- Initials from display name
- Rail labels from `nav.*` dictionary keys

## Non-goals (MVP)

Providers, API docs iframe, password/tokens, avatar upload. Locale/theme/accent PATCH is in scope.

Admin prompts / providers live under `/settings/admin` (see `specs/domain/prompt-templating.md`).

Rare dim-hints, mock-context microcopy, and dynamic API error passthrough may remain untranslated — out of SET-L1 acceptance.

## Acceptance

1. Prefs survive reload via `paths.*StorageKey`.
2. Theme applies to `<html data-theme>`.
3. Settings link not disabled; tests cover shell + page.
4. Authenticated session shows Account + Sign out; unauthenticated shows Sign in → `/login`.
5. Language `de` switches rail + settings chrome to German; `en` restores English.
6. `en.json` / `de.json` key trees stay in parity (test).
