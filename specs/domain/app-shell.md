# App Shell

**Status:** Accepted — 2026-07-30; Central Assistant host — 2026-08-10; no global PageTitle — 2026-08-27  
**Implements:** `apps/web/components/app-shell.tsx` · `components/platform-assistant-host.tsx` · `lib/paths.ts`  
**DS:** `AppFrame`, `NavRail`, `BrandCorner`, `ChatOverlay` from `@msqdx/ui` (optional slim topbar for `leading` / `actions` / `status` only)  
**Platform:** `plexon-v3/specs/domain/central-assistant-flyout.md`  
**Parity:** Checkion `specs/domain/app-shell.md` — no duplicate PageTitle chrome

## Rules

- Shared chrome only via `@msqdx/ui` (server barrel `lib/msqdx-ui.ts`, shell barrel `lib/msqdx-ui-shell.ts`).
- Composition language: `app-frame`, atmospheric background, floating rail, top-right brand corner.
- **No global `PageTitle` / duplicate hub headline** — page identity lives in the nav rail, magazine heroes, or in-page leads. Legacy `title` / `titleKey` / `titleHref` / `titleTone` props are ignored.
- Optional topbar only when `leading`, `actions`, or `status` is set (e.g. Chat mode picker, hub counts).
- Without a topbar, `.audion-stage--flush-top` adds content padding/margin so the first viewport breathes.
- **Product launcher:** `ShellBrandCorner` (`BrandCornerProductMenu`) — click opens federated app list; static staging URLs via `lib/platform-product-switcher.ts`; footer links Plexon `/products` when a Plexon public base is available. Prefer DS BrandCorner radius default (24).
- Primary nav **enabled:** Home · Projects · Personas · Target groups · Journeys · Chat · Studies
- Settings rail footer: enabled → `paths.routes.settings`; avatar from user prefs display name
- No MUI and no `@msqdx/react`.
- Routes and dock keys from `paths` — never hardcode.
- Authenticated shell MUST mount `PlatformAssistantHost` (FAB + `ChatOverlay` → Plexon `/assistant/embed`). Plexon base from runtime-config / env — never hardcode.
- Rail **Chat** remains Audion **persona/TG** chat (`/chat`) — not the platform Assistant.

## Layout notes

- **Home** (`/`) is a full-width editorial magazine (`specs/domain/home-magazine.md`) — cover + topic tiles + recent strips; no shell PageTitle/lead.
- Project / Persona / TG / Journey **index** and **detail** are full-width magazine pages (hero owns the name).
- Chat is a full-height conversation surface with topbar `leading` controls.
- Platform Assistant is the dock-end flyout (cross-app).
- Settings is a quiet prefs page (in-page sections; optional `descriptionKey` lead only).

## Acceptance

1. Shell works at desktop and stacks on narrow widths.
2. Shared package styles imported once via `app/globals.css`.
3. Rail marks active for `/`, `/projects*`, `/personas*`, `/target-groups*`, `/journeys*`, `/chat*`, `/studies*`, `/settings*`.
4. No duplicate PageTitle vs nav/magazine headline on hub or detail routes.
5. FAB opens central assistant embed; persona Chat rail unchanged.
