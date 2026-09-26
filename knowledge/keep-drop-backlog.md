# Keep / drop backlog — AUDION v3

**Date:** 2026-09-26  
**Cleanup:** plexon `knowledge/suite-cleanup.md` · Inventar: [`cleanup-inventory.md`](cleanup-inventory.md)

## Keep

| Area | Notes |
|---|---|
| Personas / Journeys / Studies / Chat | Live |
| Fixture evidence label when Agent URL missing | UC3 |
| Distillate clients (audit/activity) | Suite E4 |

## Reshape

| Area | Notes |
|---|---|
| Persona data source `fixtures` vs `api` | Env-driven; do not remove fixture path until Live-only mandate |

## Drop / reference-only (candidates)

| Area | Notes |
|---|---|
| `tmp/migrate-v2-v3/` | Likely `drop_safe` if unused by CI |
| One-off run dumps in `knowledge/` (html/pdf/json) | Orphan dumps → `drop_safe` after ref check |
| `scripts/migrate-project-v2-to-v3.mjs` | Drop if migration complete |

## Defer

| Area | Notes |
|---|---|
| Share-Links Hub writer | Ephemeral chat links — deferred by design |
