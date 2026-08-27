# Home magazine — AUDION v3

## Status
Accepted (Phase 1) — editorial magazine on `/`

## Goal
Replace the thin Panel / Easy-setup stub home with one magazine composition: brand cover, topic entry tiles, three recent entity columns (Personas · Projects · Target groups), and a short Journeys strip — Checkion home parity without scan jargon.

## Composition (`HomeMagazine` / `audion-magazine--home`)
Full stage width (no narrow Panel cap). Spine — not stacked dashboard panels:

1. **Cover** — AUDION as hero · short product lede · primary CTA **Chat** · ghost **Easy setup** (optional Projects ghost)
2. **01 · Topics** — five capability tiles: **Personas** · **Projects** · **Target groups** · **Journeys** · **Chat** → hub routes
3. **02 · Recent** — three equal columns (`audion-home-recent-columns`), each a numbered `audion-magazine-list`:
   - **Personas** — recent summaries (~6–8); link `/personas/:id`
   - **Projects** — recent summaries; link `/projects/:id`
   - **Target groups** — recent summaries; link `/target-groups/:id`
4. **03 · Journeys** — five most recent journeys as read-only index tiles (Open only — no edit/delete on home)

Sort recent items by `updatedAt` desc when present, else name. Empty columns use `EmptyState` + hub CTA.

## Data
- `fetchProjectList` · `fetchPersonaList` · `fetchTargetGroupList` · `fetchJourneyList` (existing)
- No new API fields
- Home page `dynamic = 'force-dynamic'`; tolerate empty lists if a store fails

## UI primitives (`@msqdx/ui`)
`Button` · `EmptyState` · `Text`  
App composition for magazine chrome (`audion-home-*`, topic tiles, recent lists, journey tiles). Do not invent parallel hub create dialogs on home.

## Drop / reshape
- `HomeWorkspacePanel` Panel spine and topbar Easy-setup / Queue / first-slice links as the home story
- Duplicate `AppShell` `titleKey` / `descriptionKey` on `/` — cover is the hero identity

## Out of scope (Phase 1)
- Studies / Queue / Soft-Q columns on home
- Guest marketing landing
- New shared primitive in `msqdx-ui`

## Related
- Shell: `app-shell.md`
- Hubs: `project-workspace.md`, `persona-workspace.md`, `target-group-workspace.md`, `journey-workspace.md`
- Reference: CHECKION `home-magazine.md`
