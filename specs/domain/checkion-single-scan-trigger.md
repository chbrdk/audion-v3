# CHECKION single-page scan trigger (from AUDION)

**Status:** Accepted — implemented (interactive deep-link CTA; optional BFF `POST /api/scans` later)  
**Companion (CHECKION):** `checkion-v3/specs/domain/audion-journey-scan-trigger.md`  
**Related:** `knowledge/ux-agent-surface.md` · `specs/domain/journey-workspace.md` · `specs/domain/ux-study-workspace.md` · `specs/domain/ux-journey-think-aloud.md` · PLEXON `specs/domain/collection-projects.md`

## Purpose

When a user explores a journey / step URL in AUDION (Chat-Inspect or Studies wave), optionally launch a **single-page a11y/scan** in CHECKION — not a domain crawl, and not a duplicate Journey UI in CHECKION.

## Ownership

| Concern | Owner |
|---------|--------|
| Explore / UX Journey / think-aloud / Studies | **AUDION** |
| Scan / a11y / single-page results | **CHECKION** capability |
| Collection + both product mirrors | **PLEXON** (`collection-projects.md`) |

User sees one Collection. AUDION and CHECKION remain product-local surfaces linked by bindings.

## Trigger (optional)

After a step URL is known (Chat `inspect_website` complete, or Studies wave run URL), AUDION may offer **Scan this page in CHECKION**.

Server path (AUDION BFF → CHECKION):

```http
POST {CHECKION_BASE}/api/scans
Authorization: Bearer <checkion_api_token>
Content-Type: application/json

{
  "projectId": "<checkion binding external_project_id>",
  "mode": "single",
  "url": "<step url>",
  "platformProjectId": "<optional Collection id>",
  "audionRunId": "<optional chat job / wave run id>",
  "stepUrl": "<optional; same as url when distinct from landing>"
}
```

- `mode` **must** be `single` for this trigger.
- `projectId` is the **CHECKION** project id from the Collection binding — never the AUDION-local project id alone.
- Interactive alternative: open deep-link (below) so the user confirms launch in CHECKION UI.

## Auth (product path)

| Path | Auth | Notes |
|------|------|-------|
| **Product / machine (preferred)** | `Authorization: Bearer checkion_<…>` | Existing CHECKION Settings API tokens (`specs/api/tokens.md`, `knowledge/settings-api-tokens.md`). AUDION BFF holds a token via env (implement later) or user-scoped token exchange. |
| **Interactive deep-link** | User NextAuth session in CHECKION | Browser opens `/scan?…`; user already federated via Plexon. |
| **Not used for this trigger** | `X-Service-Secret` | Reserved for Plexon ↔ product **provisioning** (`knowledge/plexon-federation.md`), not `POST /api/scans`. |

Do not invent a second secret scheme; extend documented Bearer + session gates only if the scans API contract grows.

## Correlation

Persist / pass when available:

| Field | Meaning |
|-------|---------|
| `platformProjectId` | Plexon Collection id |
| `checkionProjectId` / body `projectId` | CHECKION binding `external_project_id` |
| `audionRunId` | Optional Chat inspect job id or Studies run id |
| `stepUrl` | Optional explored URL (may equal `url`) |

AUDION may store the returned CHECKION `scan.id` on the run/inspect payload for later deep-link to `/results/[id]/overview`.

## Deep-link

Open CHECKION launch (then results after submit):

```text
{CHECKION_BASE}/scan?projectId=<checkionProjectId>&mode=single&url=<encoded step url>
```

Canonical staging base: `URL_CHECKION_V3` / `https://checkion-v3.projects-a.plygrnd.tech` — see `knowledge/paths.md` and CHECKION `knowledge/paths.md`. No hardcoded product bases in app code; use runtime env + `paths` helpers at implement time.

## Non-goals

- No CHECKION Journey-Agent UI port / Customer Journey map in CHECKION
- No soft-fork of the UX Journey Agent into CHECKION for this feature
- No `mode: deep` / `POST /api/domain-scans` from this trigger
- No implementation in the current wave — **spec only**

## Phasing

| Phase | Status |
|-------|--------|
| Spec + knowledge + deferred-doc alignment | done |
| Env (`NEXT_PUBLIC_CHECKION_BASE_URL` / `NEXT_CHECKION_BASE_URL`), deep-link helpers, Chat/Studies CTA | **done** (interactive deep-link) |
| Optional correlation columns on CHECKION scan row | done on CHECKION |
| AUDION BFF → `POST /api/scans` with Bearer token | later (optional machine path) |

## Acceptance (when implemented)

1. Optional CTA only; explore UX works without CHECKION.
2. Trigger always `mode: single` + CHECKION binding `projectId`.
3. Auth uses Bearer token and/or user session as above — not service-secret on scans.
4. Deep-link pre-fills `/scan` and lands on existing results workspace after launch.
5. Paths/bases only via `knowledge/paths.md` / runtime config.
