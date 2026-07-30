# Projects API (web proxies)

**Status:** Accepted — 2026-07-30  
**Routes:** `paths.routes.apiProjects`, `apiProjectDetail(id)`  
**Store:** `apps/web/lib/fixtures/project-store.ts`

| Method | Path | Body / notes |
|--------|------|----------------|
| POST | `/api/projects` | `ProjectWritePayload` → 201 |
| PATCH | `/api/projects/[projectId]` | Partial write → 200 / 404 |

List/detail reads go through `lib/projects.ts` (fixtures or persona-api when live).
