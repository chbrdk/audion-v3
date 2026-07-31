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
DATABASE_URL=postgresql://USER:PASSWORD@audion-v3-postgres:5432/audion
PLEXON_AUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET=<same as plexon-v3>
NEXT_PUBLIC_PLEXON_REGISTER_URL=https://plexon-v3.projects-a.plygrnd.tech/register
NEXT_PERSONA_DATA_SOURCE=fixtures
NEXT_AI_RUNTIME=auto
OPENAI_API_KEY=<secret>
# UX Journey Agent (browser website exploration) — Coolify service audion-v3-ux-journey-agent
UX_JOURNEY_AGENT_URL=http://audion-v3-ux-journey-agent:8320
UX_JOURNEY_AGENT_SECRET=<shared-with-agent-service>
# optional:
# AI_OPENAI_MODEL=gpt-5.4-mini
# AI_OPENAI_IMAGE_MODEL=gpt-image-1-mini
PORT=3000
```

### Coolify app `audion-v3-ux-journey-agent`

| Setting | Value |
|---------|--------|
| Repo | `audion-v3` |
| Base directory | `services/ux-journey-agent` |
| Dockerfile | `Dockerfile` |
| Port | `8320` |
| Volume | e.g. `/data/journey-videos` → `UX_JOURNEY_VIDEO_DIR` |

```bash
UX_JOURNEY_AGENT_SECRET=<same as web>
UX_JOURNEY_VIDEO_DIR=/data/journey-videos
OPENAI_API_KEY=<secret>
# and/or ANTHROPIC_API_KEY=
```

### Postgres (Coolify)

1. Add Postgres resource `audion-v3-postgres` in the same environment (own volume; never V2).
2. Wire Internal URL into Web app `DATABASE_URL`.
3. Container start runs `drizzle-kit push` for the `projects` table (`scripts/docker-entrypoint.sh`).

**Acceptance:** Plexon Collection sync → project on `/projects` → redeploy Audion → row still present.

Native AI (no V2 persona/chat-api): `knowledge/ai-native-2026.md`
| Coolify Env Cheat-Sheet | `plexon-v3/knowledge/coolify-plexon-v3-env-cheatsheet.md` |
| Coolify v3 Runbook | `plexon-v3/knowledge/coolify-v3-staging-runbook.md` |
| plexon-v3 GitHub | `https://github.com/chbrdk/plexon-v3` |
| Coolify source switch | `plexon-v3/knowledge/coolify-switch-to-plexon-v3-repo.md` |
