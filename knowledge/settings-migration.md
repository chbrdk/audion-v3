# Settings / user prefs — migration notes (2026-07-29)

Sources: ECHON v3 product settings · AUDION-v2 `/admin/settings*` + `/admin/profile` · audion-v3 shell placeholder.

## A) ECHON v3 (chrome SoT)

| Concern | Path |
|---------|------|
| Page | `msqdx-echon/v3/apps/web-ui/src/pages/SettingsPage.tsx` |
| Prefs | `…/src/settings/UserPrefsContext.tsx` |
| Route | `paths.settingsPath` → `/settings` in `…/src/config/paths.ts`; wired in `…/src/App.tsx` |
| Rail avatar → settings | `…/src/ui/NavRail.tsx` footer `NavLink` to `paths.settingsPath`; `Avatar name={displayName}` |
| Theme | `…/src/theme/ThemeToggle.tsx` + `ThemeContext` · storage `echon.ui.theme` |
| Locale | `…/src/i18n/LocaleToggle.tsx` + `LocaleContext` · storage `echon.ui.locale` |
| Display name | `UserPrefsProvider` · storage `echon.ui.displayName` · default `MSQ` |
| Knowledge | `msqdx-echon/v3/knowledge/msqdx-v2-settings.md` |

**Fields (all device-local):** display name (rail initials) · theme (`msqdx` / `msqdx-dark` / `msqdx-v2` / `msqdx-v2-dark`) · locale (`de` / `en`).

Sections on page: Profile · Appearance · Language.

## B) AUDION-v2

| Route | File | Role |
|-------|------|------|
| `/admin/settings` | `apps/web/app/admin/settings/page.tsx` | Landing cards: Account / Workspace / AI / Developers |
| `/admin/profile` | `apps/web/app/admin/profile/page.tsx` | Identity (name, email, company, avatar URL, locale), appearance (theme + brand color), API tokens, password, logout |
| `/admin/settings/theme` | `…/settings/theme/page.tsx` | Theme mode + brand/sidebar color (overlaps profile) |
| `/admin/settings/projects` | `…/settings/projects/page.tsx` | Redirect → `/admin/projects` |
| `/admin/settings/providers` | `…/settings/providers/page.tsx` | AI provider status (API keys configured?) |
| `/admin/settings/prompts` | `…/settings/prompts/page.tsx` | Prompt/template builder (landing card often links to `/admin/projects`) |
| `/admin/settings/api-docs` | `…/settings/api-docs/page.tsx` | OpenAPI iframe (`ADMIN_ROUTES.settingsApiDocs`) |

Nav: `msqdx-glass-admin-layout.tsx` — separate Profile + Settings items.

### MVP triage (v2 → v3)

| Keep for MVP | Skip / later |
|--------------|--------------|
| Display name (ECHON local or map from auth name) | Server profile email/company/avatar URL (needs auth) |
| Theme toggle (ECHON-style) | Brand/sidebar color (v2 MUI glass) |
| Locale toggle | Password change |
| — | API tokens |
| — | AI providers admin |
| — | Prompts builder |
| — | API docs iframe |
| — | Projects settings redirect (use Projects workspace when built) |
| Logout (when auth ships) | — |

## C) audion-v3 (shipped 2026-07-30)

- Route: `/settings` · `apps/web/app/settings/page.tsx` · `components/settings-page.tsx`
- Prefs: `apps/web/lib/user-prefs.tsx` · keys in `paths` (`displayNameStorageKey`, `themeStorageKey`, `localeStorageKey`)
- Shell: rail avatar enabled → `paths.routes.settings`
- Spec: `specs/domain/settings.md`
- Tests: `__tests__/projects-settings.test.tsx` · `app-shell.test.tsx`

## Recommended MVP composition

Single page `/settings` (ECHON chrome, not v2 card-landing):

1. **Profile** — display name + Avatar preview (UserPrefs / localStorage).
2. **Appearance** — ThemeToggle (`@msqdx/ui` ToggleGroup).
3. **Language** — LocaleToggle.
4. Enable rail avatar → `paths.routes.settings`; active when pathname starts with settings.
5. Optional stub section “Account” (logout / auth) only when auth lands; do not port providers/prompts/api-docs for MVP.

Clone order: see `knowledge/workspace-slice-pattern.md` (settings is prefs-only — lighter than domain slices; still add paths + specs + tests).
