# Target Group Workspace

**Status:** Accepted — 2026-07-29  
**Routes:** `/target-groups`, `/target-groups/[targetGroupId]`  
**Contracts:** `packages/contracts/src/target-groups.ts`  
**Knowledge:** `knowledge/target-group-migration-map.md`, `knowledge/edit-wave.md`, `knowledge/paths.md`

## Purpose

Magazine-parity workspace for audience segments: browse as app cards, read a brief, create/edit basics, follow linked personas into the persona magazine.

## Surfaces

| Route | Role |
|-------|------|
| `/target-groups` | App-card grid only — **no** section header / filter chrome |
| `/target-groups/[targetGroupId]` | Magazine detail + Edit + linked persona links |

## Index composition

- **Layout switch** (Cards | List) — shared preference `paths.hubIndexLayoutKey`
- **Cards** (default): grid of `@msqdx/ui` `Panel` app cards (`audion-tg-card`)
- **List**: numbered magazine rows — name left, meta right-aligned
- Tall cards: large display **name** bottom-aligned, lots of top air; meta (segment · persona count · status) small underneath
- **First tile**: create card (`audion-tg-card--create`) — dashed border, soft `--accent` wash, “New target group” (cards); compact button in list mode
- **Second tile**: Suggest with AI (Wave 1 stub → `suggest-target-groups`)
- Paths via `paths.routes.targetGroups` / `targetGroupDetail(id)`

## Detail composition

- Magazine hero **text-only** (`.audion-magazine-hero--text`): full-width eyebrow, title, segment deck, facets — no portrait column (same as projects)
- Optional description lede under hero
- Topbar: breadcrumb + **edit icon** + **Generate with AI** (stub → `personas/generate`) + **Ask all personas** → `/chat?targetGroupId=` (when ≥1 linked persona)
- Linked personas band (`TargetGroupLinkedPersonas`): **Cards** (default `audion-tg-card` grid) or **List** (numbered `audion-magazine-list`) via layout switch — preference in `sessionStorage` (`paths.tgLinkedPersonasLayoutKey`)
- Edit opens `TargetGroupEditDialog`

## Edit dialog

- Same `audion-edit-dialog` language as personas
- Fields: name (hero), segment + status row, description, linked persona ids (`TagInput`)
- Name required; persist via `target-group-store` + `/api/target-groups*`
- See `specs/domain/edit-dialogs.md` · `specs/domain/target-group-fields.md`

## Rail

- Nav item next to Personas (`paths.routes.targetGroups`)

## Non-goals (v1)

- Sources explorer, knowledge upload, DE locale fields UI
- Live persona-api proxy for generate/suggest (Wave 2) — see `knowledge/ai-workflows.md`
- TG ask-all **persistence** / multi-turn TG sessions (chat surface owns ephemeral rounds — `chat-workspace.md`)

## Acceptance

1. List/detail load from v3 store or API (same pattern as personas — no DEMO fallback).
2. Create card opens dialog; save navigates to new detail.
3. Detail linked personas are readable links into `/personas/[id]`; Cards | List toggle persists for the session.
4. Index has no redundant title/filter header — cards are the surface.
5. No hardcoded routes — `paths.ts` + `knowledge/paths.md`.
6. Detail CTA opens `/chat?targetGroupId=` when the segment has linked personas.
