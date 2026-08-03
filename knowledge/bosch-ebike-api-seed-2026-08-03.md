# Bosch eBike — API seed (project / TG / personas)

**Date:** 2026-08-03  
**Script:** `scripts/seed-bosch-ebike-via-api.mjs`  
**Staging origin:** `knowledge/deploy-urls.md` → `URL_AUDION_V3`

## What it creates

| Entity | Name |
|--------|------|
| Project | Bosch eBike |
| Target group | eBike Nachrüster & Kaufinteressenten |
| Personas | Alex Nachrüster · Sam Kaufinteressent |

## Auth

- Bearer `audion_…` via env `AUDION_API_TOKEN` (never commit).
- Middleware accepts env token or fixture UI tokens (verify via `/api/settings/tokens/verify`).
- Staging Coolify: set `AUDION_API_TOKEN` to the same raw token used by the script, then redeploy if Bearer gate was newly added.

## Run

```bash
# Local (Plexon unset → open API; still send Bearer for env verify smoke)
AUDION_API_TOKEN=audion_… AUDION_V3_BASE_URL=http://127.0.0.1:3006 \
  node scripts/seed-bosch-ebike-via-api.mjs

# Staging
AUDION_API_TOKEN=audion_… AUDION_V3_BASE_URL=https://audion-v3.projects-a.plygrnd.tech \
  node scripts/seed-bosch-ebike-via-api.mjs
```

## Created IDs (fill after successful run)

| Env | Project | Target group | Personas |
|-----|---------|--------------|----------|
| local (2026-08-03) | `proj-bosch-ebike-msd2qi6v` | `tg-ebike-nachr-ster-kaufinteressenten-msd2qi81` | `persona-alex-nachr-ster-msd2qi7i` · `persona-sam-kaufinteressent-msd2qi7q` |
| staging | _needs deploy of Bearer gate + `AUDION_API_TOKEN` on Coolify_ | — | — |

### Local deep links

- Project: http://127.0.0.1:3006/projects/proj-bosch-ebike-msd2qi6v
- TG: http://127.0.0.1:3006/target-groups/tg-ebike-nachr-ster-kaufinteressenten-msd2qi81
- Alex: http://127.0.0.1:3006/personas/persona-alex-nachr-ster-msd2qi7i
- Sam: http://127.0.0.1:3006/personas/persona-sam-kaufinteressent-msd2qi7q

Note: without `DATABASE_URL`, local creates are in-memory (dev HMR can reset them). Staging with Postgres keeps them after the Bearer gate is live.

## Related

- EBM UX study pack: `knowledge/scenario-packs.md`
- Produktkombinationen URL: `paths.boschEbikeProduktkombinationenUrl`
- API tokens: `knowledge/settings-api-tokens-2026.md`
