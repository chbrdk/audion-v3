# Access Model B — resource visibility (AUDION)

**Status:** Accepted — 2026-09-19  
**Companions:** `plexon-v3/specs/domain/collection-projects.md` invariant 5 · CHECKION `access-model-b-visibility.md` · `knowledge/collection-team-plexon.md`

## Rule

A signed-in user may see an AUDION capability project and its **dependent personas / target groups** only when:

1. They are the local `ownerPlexonUserId`, **or**
2. The project's `platformProjectId` is in Plexon `accessible-collections` for that user.

Company membership alone does **not** grant visibility.

## Applies to

| Resource | List | Detail / mutate |
|----------|------|-----------------|
| Projects | `filterProjectsForViewer` | `viewerCanAccessProject` |
| Target groups | filtered by parent project | `requireTargetGroupAccess` |
| Personas | filtered by parent project (`filterPersonasForViewer`) | `requirePersonaAccess` (SSR + API) |

Personas / TGs **without** `projectId` fail closed (403) when Plexon auth is configured.

## APIs

- `GET/PATCH/DELETE /api/personas/:id` and nested knowledge routes — 401 without viewer; 403 when parent project inaccessible; 404 when missing.
- `POST /api/personas` — require `projectId` + project access when auth is on.
- Persona detail SSR `/personas/:id` — `notFound()` when viewer cannot access the parent project.

## Done when

1. Direct URL to a foreign persona fails closed (SSR + API).
2. Persona list / home magazine never surfaces colleagues' personas.
3. Unit tests cover two-user gate (mirror target-groups suite).
