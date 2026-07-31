# AUDION v3 × Plexon Federation (Wave 1)

**Status:** Implemented 2026-07-30  
**Contract:** `2026-05-plexon-federation-v3`  
**App:** `apps/web` · client `apps/web/lib/plexon-*.ts`

## Ownership matrix

| Data | Owner | AUDION-v3 Wave 1 |
|------|-------|------------------|
| Users, passwords, companies, entitlements | **Plexon** | Validate + profile only |
| Platform projects + product bindings | **Plexon** | Origin call on project create |
| Usage ledger | **Plexon** | Thin `reportUsage` from chat stream |
| Personas, TGs, journeys, studies, chat fixtures | **AUDION fixtures** | Local stores only |
| Product Postgres | — | **Deferred** |

**Important (Wave 1):** Inbound project provisioning (`PUT …/platform/provisioning/projects/{id}`) writes the **in-memory fixture store**, not a durable DB. The [Projects](https://audion-v3.projects-a.plygrnd.tech/projects) UI lists that store (merged with FastAPI when `NEXT_PERSONA_DATA_SOURCE=auto`). **Redeploy / multi-replica wipes memory** — Plexon bindings stay `in_sync`, but Audion no longer has the row until you sync again.

## Write rules

1. Never create users in AUDION — login via `POST {PLEXON_AUTH_URL}/api/auth/validate-credentials`.
2. Domain CRUD writes fixtures only.
3. On project create (session + Plexon configured): `POST …/api/platform/provisioning/audion-project-origin`; store returned IDs on the fixture project. Failures are logged; create still succeeds.
4. Inbound `PUT /api/platform/provisioning/{users,projects}/[id]` require `X-Service-Secret` + matching contract version.
5. No shared cookie with Plexon.

## Env

| Var | Role |
|-----|------|
| `PLEXON_AUTH_URL` | Plexon origin (no trailing slash) |
| `PLEXON_SERVICE_SECRET` | Shared service secret (≥16 chars) |
| `NEXT_PUBLIC_PLEXON_REGISTER_URL` | Register / forgot-password deep links |
| `AUTH_SECRET` | NextAuth JWT (≥32 chars in production) |

When `PLEXON_AUTH_URL` + `PLEXON_SERVICE_SECRET` are **unset**, middleware does not force login (local fixture dev).

## Routes

- `/login` — credentials → NextAuth
- `/api/auth/[...nextauth]`
- Settings Account band — profile + logout
- `PUT /api/platform/provisioning/users/[id]`
- `PUT /api/platform/provisioning/projects/[id]`

## Paths helper

`paths.routes.login`, `paths.envPlexonAuthUrl`, `paths.envPlexonServiceSecret`, `paths.plexonFederationContractVersion` — see `apps/web/lib/paths.ts`.

## Later waves

- Product Postgres for domain data
- Full usage coverage (AI actions)
- Echon / Brandion federation
- Coolify v3 island: `PLEXON/knowledge/coolify-v3-staging-runbook.md`
