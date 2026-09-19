# Access Model B — resource visibility (AUDION)

**Status:** Accepted — 2026-09-19  
**Companions:** `plexon-v3/specs/domain/collection-projects.md` invariant 5 · CHECKION `access-model-b-visibility.md` · `knowledge/collection-team-plexon.md`

## Rule

A signed-in user may see an AUDION capability project and its **dependent personas / target groups / journeys** only when:

1. They are the local `ownerPlexonUserId`, **or**
2. The project's `platformProjectId` is in Plexon `accessible-collections` for that user.

Company membership alone does **not** grant visibility.

## Applies to

| Resource | List | Detail / mutate |
|----------|------|-----------------|
| Projects | `filterProjectsForViewer` | `viewerCanAccessProject` |
| Target groups | filtered by parent project | `requireTargetGroupAccess` (+ SSR `notFound`) |
| Personas | `filterByParentProjectForViewer` | `requirePersonaAccess` (SSR + API) |
| Journeys | `filterByParentProjectForViewer` | `requireJourneyAccess` (SSR + API) |

Personas / TGs / journeys **without** `projectId` fail closed (403) when Plexon auth is configured.

## APIs

- `GET/PATCH/DELETE /api/personas/:id` and nested knowledge — 401 / 403 / 404 as above.
- `GET/PATCH/DELETE /api/journeys/:id` (+ validation-report nested) — same.
- `POST /api/personas` / `POST /api/journeys` — require `projectId` + project access when auth is on.
- Detail SSR `/personas/:id`, `/journeys/:id`, `/target-groups/:id` — `notFound()` when inaccessible.

## Done when

1. Direct URL to a foreign persona / journey / TG fails closed (SSR + API).
2. Lists / home magazine never surface colleagues' resources.
3. Unit tests cover two-user gates.
