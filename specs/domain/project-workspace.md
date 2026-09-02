# Project Workspace

**Status:** Accepted — 2026-07-30 · DS Accordion pilot 2026-07-30  
**Routes:** `/projects`, `/projects/[projectId]`  
**Contracts:** `packages/contracts/src/projects.ts`  
**Knowledge:** `knowledge/project-migration-map.md`, `knowledge/project-knowledge-ux.md`, `knowledge/remaining-gaps.md`, `knowledge/ai-workflows.md`, `knowledge/paths.md`  
**Collection pack:** distillates only — `specs/domain/knowledge-pack-publish.md` (Plexon SoT: `plexon-v3/specs/domain/collection-knowledge-pack.md`)  
**Design system:** `@msqdx/ui` — `Accordion`, `SectionChrome` (`metaTone="accent"`) · specs `msqdx-ui-accordion.md` · `msqdx-ui-section-chrome.md`  
**Legacy:** AUDION-v2 `/admin/projects*`

## Purpose

Magazine-style project workspace: browse projects, read company context, manage project-scoped target groups and personas — without glass admin accordion. Optional Plexon platform IDs on create when federated (`knowledge/plexon-federation.md`).

## Surfaces

| Route | Role |
|-------|------|
| `/projects` | Cards|List index + create (shared `paths.hubIndexLayoutKey`) |
| `/projects/[projectId]` | Magazine detail: masthead → intro → audience → knowledge dossier |

## Index composition

- **Layout switch** (Cards | List) — shared with personas / TGs / journeys
- **Cards**: app-card grid + create tile
- **List**: numbered rows — **name left**, meta **right-aligned** (status · groups · personas); create as compact button

- Magazine hero **text-only** (`.audion-magazine-hero--text`): full-width eyebrow, title, optional DE deck, facets — no portrait/avatar
- **Intro row** (`.audion-project-intro`): description (~2/3) | larger Team canvas right (~1/3, max 32rem)
- **AI actions band** (Wave 1 stub): Suggest TGs · Suggest personas · Start research · Generate journey — see `knowledge/ai-workflows.md`
- **Audience band** (`.audion-project-split`): Target groups | Personas at **50 / 50**; compact lists with inline rename / **delete** / add (hard delete via `DELETE /api/personas|target-groups/[id]`). **Add target group** / **Add persona** rows are always visible (not hover-only); empty lists still show the add row under the empty state.
- **Project knowledge** dossier: `@msqdx/ui` **Accordion** (`.ds-accordion`) of `knowledgeChapters` + TipTap WYSIWYG panel content. `SectionChrome` count with `metaTone="accent"`. Legacy `companyContext` → single Brief chapter when chapters empty.
- Topbar: edit + **Archive** (Collection lifecycle via `POST /api/projects/:id/archive`) — not hard-delete; when the project has personas, **Ask all personas** → `/chat?projectId=` (project ask-all; see `chat-workspace.md`)
- Edit dialog status: `draft` | `published` only — use Archive CTA for Collection archive (not status select)

## Archive semantics
UI **Archive** calls `POST /api/projects/:projectId/archive` → Plexon `PATCH …/provisioning/projects/:platformProjectId` `{ status: archived }` when bound, then local mirror `status: archived` (hidden from default lists). Unbound / Plexon unconfigured: local archive only. Hard-delete remains Plexon global-admin / ops only.

## Rail

- Nav item after Home (`paths.routes.projects`)

## Non-goals (MVP)

- Research SSE stream, CHECKION topics, project prompts, bootstrap
- Live persona-api proxy for AI (Wave 2) — stubs document target calls
- Forking Accordion CSS into app globals (use `@msqdx/ui`)
- DEMO_* product seed / FastAPI→fixture fallback (Postgres/store SoT)

## Acceptance

1. List/detail load from v3 store (Postgres when `DATABASE_URL`) or live API — no DEMO fallback.
2. Create/edit persist via `/api/projects*`.
3. Project detail lists personas/TGs filtered by `projectId`; create cards pass that id.
4. Knowledge chapters use DS `Accordion`; inline edit PATCHes `knowledgeChapters` (+ derived `companyContext`).
5. AI band buttons call `/api/ai/projects/[id]/*` stubs and return `stubbed` + `target`.
6. Paths only via `paths.ts`.
7. Unit tests for normalize + panels + rail + AI stubs.
8. Archive CTA uses global Plexon lifecycle when bound; list hides `status: archived`.
