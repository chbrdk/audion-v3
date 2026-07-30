# Settings

**Status:** Accepted — 2026-07-30 · MVP + Plexon Account Wave 1  
**Route:** `/settings`  
**Knowledge:** `knowledge/settings-migration.md`, `knowledge/paths.md`, `knowledge/plexon-federation.md`  
**Reference:** ECHON v3 `SettingsPage` + `UserPrefsContext`

## Purpose

Device-local user prefs (display name, theme, locale) plus optional Plexon Account band when a session exists.

## Composition

| Band | Treatment |
|------|-----------|
| Account | When authenticated: Plexon name/email (read) + Sign out. When unauthenticated: Sign in link |
| Profile | `Avatar` + display name `Input` (localStorage); may seed from session name |
| Appearance | Theme `ToggleGroup` → `data-theme` + storage |
| Language | Locale `ToggleGroup` (`en` / `de`) — persist for later i18n |

## Shell

- Rail footer avatar enabled → `paths.routes.settings`
- Active on `/settings*`
- Initials from display name

## Non-goals (MVP)

Providers, prompts, API docs, password/tokens, brand color, PATCH profile to Plexon (Wave 1 read + logout only)

## Acceptance

1. Prefs survive reload via `paths.*StorageKey`.
2. Theme applies to `<html data-theme>`.
3. Settings link not disabled; tests cover shell + page.
4. Authenticated session shows Account + Sign out; unauthenticated shows Sign in → `/login`.
