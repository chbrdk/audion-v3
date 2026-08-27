# AUDION v3 — remaining gaps vs v2 / ECHON

**Date:** 2026-07-30  
**Full parity audit:** `knowledge/v2-v3-feature-parity.md` (domain + AI matrices, smoke checklist)

## Verdict

V3 is **not** feature-complete vs V2. Magazine MVP + UX Studies UI + AI Wave 2 + Plexon Auth Wave 1 + Settings Admin hub + Queue fixtures are shipped. Studies UI is **ahead** of V2 (V2 is API/MCP only).

## Done (MVP)

Home · **Projects** · Personas · Target Groups · Journeys · **Studies** (product loop) · Chat (+ history) · **Settings** (user prefs) · editorial magazine shell · **AI Wave 2** (live proxy + stub fallback) · **Chat live** (`auto`/`api`)

## Shipped this wave

| Surface | Notes |
|---------|-------|
| Projects | `/projects*` magazine list+detail; fixtures; members; counts; knowledge dossier |
| Settings | `/settings` — display name, theme, locale; rail avatar enabled |
| **Studies** | `/studies*` create → start/sync → evaluate → compare → Soft-Q/report → F-Fragen→chat; optional V2 proxy |
| **AI native** | OpenAI in Next BFF via `NEXT_AI_RUNTIME` — `knowledge/ai-native-2026.md` (V2 proxy deprecated) |
| **Chat live** | Native OpenAI NDJSON stream; history list still fixtures |
| **Agent via Studies** | Start/Sync = UX Journey Agent surface; Convert run→journey |
| **Persona enrich + moodboard** | Enrich topbar + Generate moodboard on Visuals; stub/live Wave 2 |
| **Journey phase AI + validate** | Generate moments on phases; Validate topbar report |
| **Research SSE polish** | Poll spine + status/latest/stream; progress UI on Start research |
| **TG + persona knowledge** | Magazine Accordion CRUD + sources list metadata |
| **Chat modalities** | Share + moodboard strip + inspect HITL + convert; **Tavus CVI video**; Voice stub |
| **Easy Setup** | **Dropped** — hub create dialogs only (`knowledge/easy-setup-2026.md`) |
| **Settings admin** | `/settings/admin` providers + prompts test + API catalog (`knowledge/settings-admin-2026.md`) |
| **Queue** | `/queue` document job fixtures (`knowledge/queue-dashboard-2026.md`) |

## Priority backlog

### P0 — unblock real product use

| Item | Notes |
|------|-------|
| ~~AI Wave 2 live proxy~~ | **Done 2026-07-30** — `withAiLiveOrStub` + `ai-workflows-live.ts`; see `knowledge/ai-workflows.md` |
| ~~Chat live-stable~~ | **Done 2026-07-30** — `auto`/`api` prefer chat-api SSE→NDJSON; fixtures only in `fixtures` mode; study prefill unchanged |

### P1 — domain depth

| Item | Notes |
|------|-------|
| ~~UX Journey Agent surface~~ | **Done 2026-07-30** — Studies Start/Sync is official entry (`knowledge/ux-agent-surface.md`); Convert to journey on wave runs |
| ~~Persona enrich + moodboard~~ | **Done 2026-07-30** — `enrichPersona` / `generateMoodboard` Wave-2 + UI (`knowledge/persona-enrich-moodboard-2026.md`) |
| ~~Journey phase AI + validate~~ | **Done 2026-07-30** — moments generate + validate report (`knowledge/journey-phase-ai-validate-2026.md`) |
| ~~Personas knowledge + profile_de~~ | **Done 2026-07-30** — docs/knowledge CRUD + bilingual mirror (`knowledge/tg-persona-knowledge-profile-de-2026.md`); ~~locked-tile rebuild~~ **Done 2026-07-30** (`knowledge/persona-locked-tiles-2026.md`) |
| Journeys | ~~Phase AI, validation report~~ **Done**; ~~chat-mode validate + report history~~ **Done 2026-07-30** (`knowledge/journey-phase-ai-validate-2026.md`) |
| ~~Projects research SSE~~ | **Done 2026-07-30** — status/latest/stream + poll UI (`knowledge/project-research-sse-2026.md`) |
| ~~TGs knowledge / sources~~ | **Done 2026-07-30** — magazine knowledge + sources list (`knowledge/tg-persona-knowledge-profile-de-2026.md`); explorer still open |

### P2 — platform / ops

| Item | Notes |
|------|-------|
| ~~Auth~~ | **Done Wave 1** — `/login`, logout, Plexon session (`knowledge/plexon-federation.md`); open when unconfigured |
| ~~Queue~~ | **Done 2026-07-30** — `/queue` fixture dashboard (`knowledge/queue-dashboard-2026.md`) |
| ~~Settings admin~~ | **Done 2026-07-30** — hub; prompts + **Prompt Builder workspace** + API tokens **Done 2026-07-31** (`knowledge/prompt-builder-workspace-2026.md`, `knowledge/settings-api-tokens-2026.md`) |
| Chat modalities | ~~Public share, moodboard drawer, inspect/convert~~ **Done 2026-07-30**; ~~Tavus CVI~~ **Done 2026-08-17** (`knowledge/tavus-video-chat.md`); Voice stub remains |
| ~~Easy Setup~~ | **Dropped 2026-08-27** — was `/setup` + bootstrap API (`knowledge/easy-setup-2026.md`) |

### Open / out of scope (product policy)

- Statistical n=15 / Testbirds parity on Soft-Q
- Full report versioning / artifact CDN
- New charting framework (keep ECHON radar + DS bars)
- V2 Admin Studies UI (not needed — V3 is the Studies UI)
- Product Postgres for **projects** — done (staging `DATABASE_URL`); personas/TGs/journeys/chat still fixtures · Echon/Brandion federation · Plugins, VR, GEO, MCP host
- **V2 Coolify Prod bleibt getrennt** — siehe `knowledge/v2-v3-runtime-separation.md`

## Deferred depth (detail pointers)

- Projects: federation, project prompts — `project-migration-map.md`; Easy Setup **dropped** → `easy-setup-2026.md`
- Settings: full admin stack — ~~hub + prompts + tokens shipped~~ `settings-admin-2026.md` / `settings-api-tokens-2026.md` — `settings-migration.md`
- Personas: see `persona-magazine.md` / `persona-migration-map.md`
- TGs: `target-group-migration-map.md`
- Journeys + Chat: `journeys-chat-gaps.md`
- Studies open items: `ux-studies.md` Done vs open table

## Smoke

Manual checklist (fixtures Studies, optional `api` proxy, AI stubs, chat, shell): **§6** in `knowledge/v2-v3-feature-parity.md`.
