# Projects API (web proxies)

**Status:** Accepted — 2026-07-30 · Collection archive 2026-08-28  
**Routes:** `paths.routes.apiProjects`, `apiProjectDetail(id)`, `apiProjectArchive(id)`  
**Store:** `apps/web/lib/fixtures/project-store.ts`

| Method | Path | Body / notes |
|--------|------|----------------|
| POST | `/api/projects` | `ProjectWritePayload` → 201 |
| PATCH | `/api/projects/[projectId]` | Partial write → 200 / 404 |
| POST | `/api/projects/[projectId]/archive` | Archive Collection via Plexon when bound; local `status: archived` → `ProjectDetail` |
| DELETE | `/api/projects/[projectId]` | **Alias of archive** (204) — no hard-delete of Collection mirrors |

## Archive (global)
When Plexon auth is configured (`PLEXON_AUTH_URL` + service secret) and the project has a real Collection UUID, archive calls Plexon `PATCH /api/platform/provisioning/projects/:platformProjectId` with service secret + `X-Plexon-User-Id` (`{ status: 'archived' }`). Fan-out upserts archived to sibling products. Unbound / unconfigured: local archive only. Restore via Plexon hub.

List/detail reads go through `lib/projects.ts` (fixtures or persona-api when live).
