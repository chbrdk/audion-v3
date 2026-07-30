# AUDION v3 / Plexon v3 — deploy URLs (Coolify)

**Date:** 2026-07-30  
**Policy:** `plexon-v3/knowledge/ecosystem-v3-parallel-track.md` (Prod-mirror note: `PLEXON/knowledge/plexon-v3-repo.md`)  
**Runbook:** `plexon-v3/knowledge/coolify-v3-staging-runbook.md`

Central place for public origins — reference from Coolify env / docs; do not hardcode in app UI.

| Key | URL |
|-----|-----|
| `URL_AUDION_V3` | `https://audion-v3.projects-a.plygrnd.tech` |
| `URL_PLEXON_V3` | `https://plexon-v3.projects-a.plygrnd.tech` |
| `URL_PLEXON_V3_REGISTER` | `https://plexon-v3.projects-a.plygrnd.tech/register` |

## Coolify app `audion-v3-web`

| Setting | Value |
|---------|--------|
| Repo | `audion-v3` |
| Dockerfile | `Dockerfile` (repo root) |
| Port | `3000` |
| Domain | `audion-v3.projects-a.plygrnd.tech` |
| Health | `GET /api/health` |

### Runtime env (minimum)

```bash
AUTH_SECRET=<≥32 chars>
PLEXON_AUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET=<same as plexon-v3>
NEXT_PUBLIC_PLEXON_REGISTER_URL=https://plexon-v3.projects-a.plygrnd.tech/register
NEXT_PERSONA_DATA_SOURCE=fixtures
PORT=3000
```

| Coolify Env Cheat-Sheet | `plexon-v3/knowledge/coolify-plexon-v3-env-cheatsheet.md` |
| Coolify v3 Runbook | `plexon-v3/knowledge/coolify-v3-staging-runbook.md` |
| plexon-v3 GitHub | `https://github.com/chbrdk/plexon-v3` |
| Coolify source switch | `plexon-v3/knowledge/coolify-switch-to-plexon-v3-repo.md` |
