# Journey Workspace

**Status:** Accepted — 2026-07-29 · Implemented MVP 2026-07-29 · Validate chat/history 2026-07-30  
**Routes:** `/journeys`, `/journeys/[journeyId]`  
**Contracts:** `packages/contracts/src/journeys.ts` · `ai-workflows.ts`  
**Knowledge:** `knowledge/journey-migration-map.md`, `knowledge/journeys-chat-gaps.md`, `knowledge/journey-phase-ai-validate-2026.md`, `knowledge/paths.md`  
**Legacy:** AUDION-v2 `/admin/journeys*` · `knowledge/journeys-routing.md` · `knowledge/journey_mapper.md`

## Purpose

Browse customer journey maps as a magazine/card index, read a phase timeline on detail, and create/edit basics via DS dialogs — without the legacy glass admin canvas.

## Surfaces

| Route | Role |
|-------|------|
| `/journeys` | App-card / magazine grid; **first tile** is create card |
| `/journeys/[journeyId]` | Full-width journey article: meta + ordered phases (read) + Edit |

## Index composition

- **Layout switch** (Cards | List) — shared preference `paths.hubIndexLayoutKey`
- **Cards** (default): display **name**, journey type, status, linked TG name/count of phases
- **List**: numbered magazine rows (name + meta)
- **Create tile** (`audion-index-card--create` language): “New journey” (cards); compact button in list mode
- **Generate with AI tile** (Wave 1 stub → `/api/journeys/generate`)
- Optional filter `q` (name / type) — no header create button
- Paths via `paths.routes.journeys` / `journeyDetail(id)`

## Detail composition

- Magazine lede: **full `page-body` width** (no 64rem magazine cap) · **50/50 split hero** — headline + type left, facet tiles right (`.audion-magazine-hero--split`); no portrait column
- Topbar actions: **Edit** + **Delete** + **Validate** (`ValidateJourneyButton`)
- **Phase slider** (`JourneyPhaseSlider`): horizontal snap timeline (v2 editor pattern, AUDION magazine style)
  - Step chips + **+ Phase** chip + prev/next + `n / total`
  - Roomier phase cards: number, Focus, Moments, **edit + delete** icons + **Generate moments**
  - Trailing **New phase** create card (dashed) opens the create dialog
  - Phase delete confirms, then PATCH remaining `phases[]`
  - Saves via PATCH `phases[]` on the journey (fixture store / API)
  - Not a freeform canvas in MVP
- **Validate dialog:** persona select, mode (`automated` / `chat` / `both`), report history select, fit report with friction + persona quotes

## Edit dialog

- Same `audion-edit-dialog` language as personas/TG — see `specs/domain/edit-dialogs.md`
- MVP fields: name (hero), type, status, description, `targetGroupId` (Select or TagInput of one)
- Phase structural edit: `JourneyPhaseEditDialog` from slide edit icon / create card / `+ Phase` chip — persists full `phases[]` via PATCH
- Name required; persist via fixture store `/api/journeys*` or live API

## Data

- Same data-source pattern as personas until a dedicated env exists: `NEXT_PERSONA_DATA_SOURCE` / shared backend URL
- Fixtures: `apps/web/lib/fixtures/journeys.ts` + `journey-store.ts`
- Validation history: `journey-validation-store.ts` (in-memory)
- Journeys belong to a target group when linked (`targetGroupId`)

## Non-goals (MVP)

- Full glass canvas drag/drop
- Measurements dashboard (`/dashboard`)
- Analytics (GA4 / Hotjar) panels
- Durable Postgres validation report store
- Deep-link from validation quotes into Chat workspace
- CHECKION single-page scan handoff from journey phases (specced separately — `specs/domain/checkion-single-scan-trigger.md`; implement later)

## Acceptance

1. Index renders store or API (no DEMO fallback); create tile opens dialog; save navigates to detail.
2. Detail shows ordered phases in a horizontal slider with create card and per-phase edit/delete; journey delete returns to index.
3. Linked TG is a real navigation link when `targetGroupId` resolves.
4. Empty / error / loading use `@msqdx/ui` (`EmptyState`, `Alert`, `LoadingText`/`Skeleton`).
5. No hardcoded routes — `paths.ts` + `knowledge/paths.md`.
6. Rail marks `/journeys*` active (`IconJourneys`).
7. Validate posts `mode` + `persona_ids`; history list/detail reopen prior reports.
