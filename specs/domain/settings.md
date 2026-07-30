# Settings

**Status:** Accepted — 2026-07-30 · MVP implemented 2026-07-30  
**Route:** `/settings`  
**Knowledge:** `knowledge/settings-migration.md`, `knowledge/paths.md`  
**Reference:** ECHON v3 `SettingsPage` + `UserPrefsContext`

## Purpose

Device-local user prefs: display name, theme, locale. Single page (not v2 multi-route hub).

## Composition

| Band | Treatment |
|------|-----------|
| Profile | `Avatar` + display name `Input` (localStorage) |
| Appearance | Theme `ToggleGroup` → `data-theme` + storage |
| Language | Locale `ToggleGroup` (`en` / `de`) — persist for later i18n |

## Shell

- Rail footer avatar enabled → `paths.routes.settings`
- Active on `/settings*`
- Initials from display name

## Non-goals (MVP)

Providers, prompts, API docs, password/tokens, brand color, server profile/email

## Acceptance

1. Prefs survive reload via `paths.*StorageKey`.
2. Theme applies to `<html data-theme>`.
3. Settings link not disabled; tests cover shell + page.
