# Federation without demo-user env (2026-08-03)

## Problem
Bearer/machine project creates skipped Plexon Collection registration because origin required `ownerPlexonUserId` + `platformCompanyId` from a session (or Coolify demo UUIDs).

## Fix
1. **plexon-v3** `resolveProductOriginOwner` — auto-pick membership or bootstrap Federation home (`knowledge/product-origin-owner-resolution.md`). Origin body owner/company optional.
2. **audion-v3** — `POST /api/projects`, easy-setup, `sync-plexon` always call origin when federated.
3. **checkion-v3** — live create + GEO auto-create always call origin when federated.

## Deploy
Redeploy **plexon-v3** first, then **audion-v3** / **checkion-v3**. Staging (as of push) had not yet picked up `GET /api/projects/:id` or `sync-plexon` — Coolify auto-deploy may be lagging.

## Repair Bosch
```bash
curl -X POST https://audion-v3.projects-a.plygrnd.tech/api/projects/proj-bosch-ebike-msd3hwtv/sync-plexon \
  -H "Authorization: Bearer $AUDION_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain":"bosch-ebike.com"}'
```
