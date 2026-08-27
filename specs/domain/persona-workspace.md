# Persona Workspace

**Status:** Accepted — 2026-07-29  
**Routes:** `/personas`, `/personas/[personaId]`  
**Contracts:** `packages/contracts/src/personas.ts`  
**Knowledge:** `knowledge/persona-magazine.md`, `knowledge/edit-wave.md`, `knowledge/paths.md`

## Purpose

Browse personas as a magazine index, read a full-width profile article, and create/edit via DS dialogs — without the legacy admin glass surface.

## Surfaces

| Route | Role |
|-------|------|
| `/personas` | Portrait magazine grid + filter; **first tile** is create card |
| `/personas/[personaId]` | Full-width magazine article (read) + Edit / Create-from-template |

## Index composition

- **Layout switch** (Cards | List) on the index — preference in `sessionStorage` (`paths.hubIndexLayoutKey`); shared with projects / TGs / journeys
- **Cards** (default): `@msqdx/ui` `Panel` app cards (`audion-tg-card` / `audion-tg-grid`) — large name, airy top, small meta (role · archetype · status)
- **List**: numbered `audion-magazine-list` rows — name left, meta right-aligned — same destinations
- **Create tile** (`audion-tg-card--create`): brand-tinted dashed panel + “New persona” (cards); compact button in list mode
- **Generate with AI tile** (Wave 1 stub → `personas/generate`; pick TG) — `knowledge/ai-workflows.md`
- Optional filter form (`q`) — no header create button
- Paths via `paths.routes.personas` / `personaDetail(id)`

## Detail composition

- Magazine chrome: `briefing-*`, `signal-*`, `geo-places` facets, Goals|Frustrations as **inline-editable lists**, Channels as **icon bubbles** + picker, Notes
- Goals / Frustrations: `PersonaEditableList` — click row → inline input (Enter/blur save, Esc cancel); section “+” adds; delete icon confirms via `Dialog`; PATCH `{ [field]: nextItems }` to `paths.routes.apiPersonaDetail(id)`
- Channels: `PersonaChannelBubbles` — monochrome bubbles; click / right-click opens icon-picker context menu (`CHANNEL_PICKER_OPTIONS`); PATCH `{ channels }`
- Topbar: breadcrumb + **edit icon button** (and template) — profile fields only in the dialog
- Modes: `edit` · `create` · `template` (copy fields → new draft; template keeps list arrays from source)

## Edit dialog

- Class `audion-edit-dialog` — wider sheet, airy padding
- Form uses DS face from `@msqdx/ui` (`Field` `size="md"`, `Input`/`Textarea`/`Select`) — **profile only** (name, role, status, archetype, location, age, bio)
- Goals / Frustrations / Channels are **not** in the dialog; create still sends empty arrays; template copies source arrays
- Name required; persist via fixture store `/api/personas` or live API when wired
- See `specs/domain/edit-dialogs.md`

## Data

- Source: `NEXT_PERSONA_DATA_SOURCE` = `auto` | `fixtures` | `api`
  - `fixtures` = v3 store only (Postgres when `DATABASE_URL`, else empty memory)
  - `auto` / `api` = live FastAPI when available — **no DEMO_* fallback** (`allowPersonaFixtureFallback` always false)
- Store: `persona-store.ts` · DEMO shapes in `personas.ts` only for tests via `resetPersonaStore()`

## Acceptance

1. Index renders store or API; filter narrows by name/role/archetype. Empty when store empty — never auto-seed DEMO.
2. Create tile opens create dialog; save navigates to new detail.
3. Detail magazine reads; Edit / template dialogs validate name and refresh; Goals/Frustrations edit inline; Channels via bubble icon picker.
4. Empty / error states use `@msqdx/ui` primitives.
5. No hardcoded routes — `apps/web/lib/paths.ts`.
