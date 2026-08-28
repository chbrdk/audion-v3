# Migrate AUDION-v2 project → v3 suite (Plexon-first)

**Script:** `scripts/migrate-project-v2-to-v3.mjs`  
**Canonical path:** [`plexon-v3/specs/domain/collection-projects.md`](../../plexon-v3/specs/domain/collection-projects.md) (create Collection → sync mirrors → fill product content).

**Scope:** Collection + AUDION content (target groups, personas, knowledge text, optional journeys).  
**Not copied:** avatars/moodboard binaries, RAG chunks, chat history, studies/agent runs, CHECKION scans, Brandion packs.

## Order of operations

1. **plexon-v3** — create Collection under a **v3** company (`POST …/companies/:id/platform-projects`), or reuse `PLATFORM_PROJECT_ID` + sync.
2. Plexon fans out capability mirrors (audion / checkion / brandion / creation / spirion).
3. Script **PATCHes** the synced Audion `externalProjectId` (never `POST /api/projects` — that would Audion-first + origin).
4. Creates personas / TGs / optional journeys under that Audion id.

Legacy Plexon / CHECKION UUIDs from v2 are **reference-only** — they do not exist on the v3 islands.

## Source IDs (example / reference)

| Field | Value | Role on v3 |
|-------|--------|------------|
| AUDION (v2) project | `361f189a-b372-4990-958f-52555686a293` | `SOURCE_PROJECT_ID` (read) |
| PLEXON platform project (v2) | `83708141-66dc-4871-9493-c882da820067` | legacy only → `LEGACY_PLATFORM_PROJECT_ID` |
| PLEXON company (v2) | `555f32e1-c653-4a1f-ae2c-a697840ffa19` | usually **not** valid on plexon-v3 — pick/create a v3 company |
| CHECKION project (v2) | `cc9a7d62-8d33-462c-a0dc-b73472b88524` | legacy only → `LEGACY_CHECKION_PROJECT_ID` |

## Env

| Var | Required | Meaning |
|-----|----------|---------|
| `AUDION_V2_API_URL` | yes | Public BFF: `https://audion.projects-a.plygrnd.tech/api` (paths `/projects/…`). Compose-internal alt: `http://api:8000` |
| `AUDION_V2_API_TOKEN` | yes | Bearer `audion_…` |
| `AUDION_API_TOKEN` | write | V3 Bearer (Coolify `AUDION_API_TOKEN`) |
| `PLEXON_API_TOKEN` | write | Bearer `plexon_<64-hex>` (Plexon Settings → API) |
| `PLEXON_BASE_URL` | no | default `https://plexon-v3.projects-a.plygrnd.tech` |
| `AUDION_V3_BASE_URL` | no | default `https://audion-v3.projects-a.plygrnd.tech` |
| `SOURCE_PROJECT_ID` | yes | V2 Audion project UUID |
| `PLATFORM_COMPANY_ID` | write* | **plexon-v3** company UUID (*or* set `PLATFORM_PROJECT_ID`) |
| `PLATFORM_PROJECT_ID` | no | Existing **v3** Collection — skip create, sync + fill |
| `COLLECTION_NAME` / `COLLECTION_DOMAIN` | no | Override Collection create fields |
| `DRY_RUN` | no | default `1` |
| `INCLUDE_JOURNEYS` | no | default `0` |
| `LEGACY_*` | no | Logged as reference only |

## Run

```bash
# 1) Dry-run — reads V2, writes plan.json (no Plexon/Audion writes)
DRY_RUN=1 \
  SOURCE_PROJECT_ID=361f189a-b372-4990-958f-52555686a293 \
  AUDION_V2_API_URL=https://audion.projects-a.plygrnd.tech/api \
  AUDION_V2_API_TOKEN=audion_… \
  node scripts/migrate-project-v2-to-v3.mjs

# 2) Write — reuse Collection from Plexon UI, then fill Audion mirror
DRY_RUN=0 PLATFORM_PROJECT_ID=f3d27e9f-d14c-4880-82be-3ca31c051173 \
  SOURCE_PROJECT_ID=361f189a-b372-4990-958f-52555686a293 \
  AUDION_V2_API_URL=https://audion.projects-a.plygrnd.tech/api \
  AUDION_V2_API_TOKEN=… AUDION_API_TOKEN=… PLEXON_API_TOKEN=… \
  node scripts/migrate-project-v2-to-v3.mjs
```

Staging V2 REST is proxied at `{AUDION_WEB}/api` (OpenAPI also at `/openapi.json`). MCP (`https://mcp-audion.…`) is **not** a drop-in for this script.

## Output

- `tmp/migrate-v2-v3/plan.json` — steps + counts
- `tmp/migrate-v2-v3/id-map.json` — Collection + mirrors + v2→v3 persona/TG map
- Links: `{PLEXON}/projects/{collectionId}` · `{AUDION}/projects/{audionMirrorId}`
