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
| Projects (list / create / Plexon provisioning) | **AUDION Postgres** | `projects` table when `DATABASE_URL` set; else in-memory fixtures |
| Personas + target groups | **AUDION Postgres** | `personas` / `target_groups` tables when `DATABASE_URL` set; else fixtures |
| Product Postgres (journeys+) | — | **Deferred** |

**Projects persistence:** With `DATABASE_URL`, inbound `PUT …/platform/provisioning/projects/{id}` and UI create/list write Postgres. Redeploy keeps rows. Without `DATABASE_URL` (local), memory fixtures remain (wiped on process restart).

**Personas / target groups:** Same `DATABASE_URL` gate. Tables `personas` (scalar list cols + jsonb `payload`) and `target_groups` (linked persona ids + knowledge jsonb). Catalog GET and CRUD use Postgres when configured; otherwise DEMO fixtures.

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
- `GET /api/platform/provisioning/projects/[id]` — Plexon Collection dashboard summary (service secret + `X-Plexon-User-Id`)

### Project summary contract (`GET …/projects/[id]`)

Resolved by `platformProjectId` (Plexon Collection id). Response includes:

| Field | Type | Notes |
|-------|------|--------|
| `externalProjectId` | string | Audion project id |
| `platformProjectId` | string | Echo of request id |
| `personaCount` | number | Personas with `projectId === externalProjectId` |
| `targetGroupCount` | number | Target groups for that project |
| `journeyCount` | number | Journeys for that project |
| `studyCount` | number | UX studies for that project |
| `targetGroups` | `{ id, name, segment, personaCount, status }[]` | Catalog for Plexon UI |
| `personas` | `{ id, name, role, status, targetGroupId? }[]` | Catalog; `targetGroupId` from linked TG when present |
| `journeys` | `{ id, name, status, journeyType, phaseCount, targetGroupName? }[]` | Catalog |
| `studies` | `{ id, name, status, waveCount, targetUrlKey? }[]` | Catalog |

Deep-links (Audion app origin, not `/admin`): `/target-groups/{id}`, `/personas/{id}`, `/chat?personaId=…&projectId=…`, `/journeys/{id}`, `/studies/{id}`.

## Paths helper

`paths.routes.login`, `paths.envPlexonAuthUrl`, `paths.envPlexonServiceSecret`, `paths.plexonFederationContractVersion` — see `apps/web/lib/paths.ts`.

## Later waves

- Journeys / studies / chat on Product Postgres
- Full usage coverage (AI actions)
- Echon / Brandion federation
- Coolify v3 island: `PLEXON/knowledge/coolify-v3-staging-runbook.md`
