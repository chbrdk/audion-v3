# Coolify — MSQDX-Audion-v3 inventory

**Date:** 2026-08-03  
**MCP:** `user-coolify` (read-only — list/get only; no deploy/restart via this token)  
**Project:** `MSQDX-Audion-v3` · uuid `ipevzbcyerfjylknqhifgntn`  
**URLs SoT:** `knowledge/deploy-urls.md`

## Resources

| Resource | Coolify name | UUID | FQDN / notes |
|----------|--------------|------|--------------|
| Web | `audion-v3:main-app` | `putvwgqq1c9yb30tsqosujde` | https://audion-v3.projects-a.plygrnd.tech · repo `chbrdk/audion-v3` · branch `main` · base `/` |
| UX Journey Agent | `audion-v3-ux-journey-agent` | `lfv0921nlqzl0qow9xse4it4` | https://uxagent.projects-a.plygrnd.tech · base `/services/ux-journey-agent` |
| Postgres | `audion-v3-postgres` | `smr9w75vb61w1t8t6kean0xu` | healthy |

## P4 deploy note

Commit `cf780de` needs a **rebuild** of at least `audion-v3-ux-journey-agent` (perception hard-abandon lives there). Web rebuild optional for Soft-Q-only path.

MCP cannot trigger deploy. Use Coolify UI → Deploy, or a write-capable Coolify API token (`POST /api/v1/deploy` / application restart).

## Observed config quirks (2026-08-03)

- Agent `ports_exposes` reported as `3000` while app listens on **8320** (see Dockerfile / deploy-urls). Traefik may still work via Coolify port mapping — verify if health/routing breaks.
- Agent health check path is `/` (disabled); prefer `/health` when enabling checks.
- Both apps `updated_at` ~ `2026-08-03T20:23:17Z` — recent activity; confirm image is on `cf780de` before Persona Lab smoke.
