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
| `/projects` | App-card grid + create |
| `/projects/[projectId]` | Magazine detail: masthead → intro → audience → knowledge dossier |

## Detail composition

- Magazine hero **text-only** (`.audion-magazine-hero--text`): full-width eyebrow, title, optional DE deck, facets — no portrait/avatar
- **Intro row** (`.audion-project-intro`): description (~2/3) | larger Team canvas right (~1/3, max 32rem)
- **AI actions band** (Wave 1 stub): Suggest TGs · Suggest personas · Start research · Generate journey — see `knowledge/ai-workflows.md`
- **Audience band** (`.audion-project-split`): Target groups | Personas at **50 / 50**; compact lists with inline rename / remove / add
- **Project knowledge** dossier: `@msqdx/ui` **Accordion** (`.ds-accordion`) of `knowledgeChapters` + TipTap WYSIWYG panel content. `SectionChrome` count with `metaTone="accent"`. Legacy `companyContext` → single Brief chapter when chapters empty.
- Topbar: edit actions only (persona pattern)

## Rail

- Nav item after Home (`paths.routes.projects`)

## Non-goals (MVP)

- Research SSE stream, CHECKION topics, project prompts, bootstrap
- Product Postgres (platform IDs stored on fixtures in Wave 1)
- Live persona-api proxy for AI (Wave 2) — stubs document target calls
- Forking Accordion CSS into app globals (use `@msqdx/ui`)

## Acceptance

1. List/detail load from fixtures (auto fallback like other slices).
2. Create/edit persist via `/api/projects*`.
3. Project detail lists personas/TGs filtered by `projectId`; create cards pass that id.
4. Knowledge chapters use DS `Accordion`; inline edit PATCHes `knowledgeChapters` (+ derived `companyContext`).
5. AI band buttons call `/api/ai/projects/[id]/*` stubs and return `stubbed` + `target`.
6. Paths only via `paths.ts`.
7. Unit tests for normalize + panels + rail + AI stubs.
