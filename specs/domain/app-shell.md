# App Shell

**Status:** Accepted — 2026-07-30; Central Assistant host — 2026-08-10  
**Implements:** `apps/web/components/app-shell.tsx` · `components/platform-assistant-host.tsx` · `lib/paths.ts`  
**DS:** `AppFrame`, `NavRail`, `BrandCorner`, `PageTitle`, `ChatOverlay` from `@msqdx/ui`  
**Platform:** `plexon-v3/specs/domain/central-assistant-flyout.md`

## Rules

- Shared chrome only via `@msqdx/ui` (server barrel `lib/msqdx-ui.ts`, shell barrel `lib/msqdx-ui-shell.ts`).
- Composition language: `app-frame`, atmospheric background, floating rail, top-right brand corner, quiet topbar.
- **Product launcher:** `ShellBrandCorner` (`BrandCornerProductMenu`) — click opens federated app list; static staging URLs via `lib/platform-product-switcher.ts`; footer links Plexon `/products` when a Plexon public base is available. Prefer DS BrandCorner radius default (24).
- Topbar: `PageTitle` + optional `TopStatus` / actions / `leading`.
- Primary nav **enabled:** Home · Projects · Personas · Target groups · Journeys · Chat
- Settings rail footer: enabled → `paths.routes.settings`; avatar from user prefs display name
- No MUI and no `@msqdx/react`.
- Routes and dock keys from `paths` — never hardcode.
- Authenticated shell MUST mount `PlatformAssistantHost` (FAB + `ChatOverlay` → Plexon `/assistant/embed`). Plexon base from runtime-config / env — never hardcode.
- Rail **Chat** remains Audion **persona/TG** chat (`/chat`) — not the platform Assistant.

## Layout notes

- Project / Persona / TG / Journey **index** and **detail** are full-width magazine pages.
- Chat is a full-height conversation surface (persona).
- Platform Assistant is the dock-end flyout (cross-app).
- Settings is a quiet prefs page (ECHON pattern).

## Acceptance

1. Shell works at desktop and stacks on narrow widths.
2. Shared package styles imported once via `app/globals.css`.
3. Rail marks active for `/`, `/projects*`, `/personas*`, `/target-groups*`, `/journeys*`, `/chat*`, `/settings*`.
4. FAB opens central assistant embed; persona Chat rail unchanged.