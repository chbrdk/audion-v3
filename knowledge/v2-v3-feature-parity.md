# AUDION v2 ↔ v3 — feature parity audit

**Date:** 2026-07-30  
**Verdict:** V3 does **not** have full V2 functionality. V3 ships a magazine shell with MVP CRUD and a first-class **UX Studies** product loop (UI ahead of V2). Most other domains are fixture-backed UI; AI Wave 1 is stubbed; Auth, Queue, UX Journey Agent surface, Voice/Tavus, and admin settings are missing.

**Related:** `knowledge/remaining-gaps.md` · `knowledge/ai-workflows.md` · `knowledge/ux-studies.md` · migration maps below · V2 AI inventory `AUDION-v2/knowledge/ai-trigger-buttons-inventory.md`

## Status legend

| Status | Meaning |
|--------|---------|
| `shipped` | Real UI + working data path (fixtures and/or live) |
| `stub` | UI present; Next route returns fixture/`stubbed: true` (not live V2) |
| `proxy` | Next BFF can forward to V2 when `NEXT_PERSONA_DATA_SOURCE=api` |
| `partial` | Subset of V2 capability |
| `missing` | Not in V3 |
| `out_of_scope` | Intentionally deferred / platform-only on V2 |
| `v3_ahead` | V3 has product UI V2 lacks |

## Architecture (data path)

```
V3 Magazine UI → Next /api/* BFF
  ├─ Domain CRUD → fixture stores (default) / optional SSR read from V2 (auto|api)
  ├─ AI Wave 1 → stub routes documenting V2 target calls
  ├─ Chat stream → fixtures unless DATA_SOURCE=api → chat-api
  └─ Studies → fixtures OR proxy → V2 /ux-studies* (api mode only)
```

Env: `NEXT_PERSONA_DATA_SOURCE` (`fixtures` \| `auto` \| `api`), `NEXT_PERSONA_BACKEND_INTERNAL_URL`, `NEXT_CHAT_API_INTERNAL_URL` — see `knowledge/paths.md` · `apps/web/lib/paths.ts` · `runtime-config.ts`.

---

## 1. Domain matrix (core product)

| Domain | V2 | V3 | Parity | Status tags |
|--------|----|----|--------|-------------|
| **Projects** | Research SSE, suggest TG/persona, generate journey, members, CHECKION topics, project prompts | Magazine list/detail, members, knowledge dossier, AI buttons | Partial | `shipped` UI · `stub` AI · `missing` SSE/federation/prompts |
| **Personas** | Enrich, field AI, avatar, moodboard gen, docs/knowledge, translate, geo-questions, UX history | Magazine portrait + editable bands + field-suggest + avatar button | Partial | `shipped` edit UX · `stub` AI · `missing` docs/moodboard-gen/enrich/bilingual |
| **Target groups** | Suggest TG, generate persona, knowledge/docs/explorer | Magazine list/detail + linked personas + AI stubs | Partial | `shipped` magazine · `stub` AI · `missing` sources/knowledge/explorer |
| **Journeys** | Generate, phase/element AI, validate, UX-run→journey, tracking/insights | List/detail + phase slider + edit MVP + generate stub | Weak | `shipped` MVP · `stub` generate · `missing` validate/convert/agent |
| **UX Studies** | API+MCP full (start/sync/evaluate/compare); **no web UI** | `/studies*` full loop + Soft-Q/Report/Compare/F-Fragen→Chat | V3 ahead (UI) | `v3_ahead` UI · `proxy` to V2 · `shipped` fixtures |
| **Chat** | Stream, history, inspect_website, voice, Tavus, convert, share `/chat` | Editorial chat + history + study/persona prefill | Partial | `shipped` text MVP · `proxy` optional · `missing` voice/Tavus/share |
| **Settings** | Providers, prompts+test, theme, profile, tokens, API docs | Prefs + `/settings/admin` hub | Partial | `shipped` prefs + admin hub · `missing` API tokens |
| **Auth / Setup** | `/login`, `/register`, `/admin/setup` bootstrap | `/login` + `/setup` Easy Setup | Partial | `shipped` Easy Setup · login Wave 1 · register via Plexon |
| **Queue / Ops** | `/admin/queue` | `/queue` fixtures | Partial | `shipped` fixture dashboard · no Celery/Redis |
| **UX Journey Agent UI** | `/admin/ux-journey-agent` | — (Studies Start/Sync can orchestrate via API) | Missing surface | `missing` UI · `proxy` via Studies |

### Route map (quick)

| Area | V2 | V3 |
|------|----|----|
| Projects | `/admin/projects*` | `/projects*` |
| Personas | `/admin/personas*`, `/admin/personas-v2*` | `/personas*` |
| Target groups | `/admin/target-groups*`, `…-v2*` | `/target-groups*` |
| Journeys | `/admin/journeys*` | `/journeys*` |
| Studies | *(API only)* | `/studies*` |
| Chat | `/admin/chat`, `/chat` | `/chat`, `/chat/history` |
| Settings | `/admin/settings*` | `/settings` · `/settings/admin*` |
| Queue | `/admin/queue` | `/queue` |
| Agent | `/admin/ux-journey-agent` | — |
| Auth | `/login`, `/register` | `/login` · `/setup` |

Migration maps: `persona-migration-map.md` · `target-group-migration-map.md` · `journey-migration-map.md` · `chat-migration-map.md` · `project-migration-map.md` · `settings-migration.md`.

---

## 2. Feature checklist by domain

### Projects (`knowledge/project-migration-map.md`)

| Capability | V3 status |
|------------|-----------|
| List / create / detail magazine | `shipped` |
| Members / audience links | `shipped` (fixtures) |
| Knowledge dossier (TipTap) | `shipped` |
| Suggest TGs / personas | `stub` |
| Research start | `stub` (no SSE polish) |
| Generate journey from project | `stub` |
| Project prompts / CHECKION topics / PLEXON mirror | `missing` / `out_of_scope` |
| Easy Setup bootstrap | `shipped` (`/setup` · `knowledge/easy-setup-2026.md`) |

### Personas (`knowledge/persona-migration-map.md` · `persona-magazine.md`)

| Capability | V3 status |
|------------|-----------|
| Portrait grid + magazine detail | `shipped` |
| Editable traits / lists / communication / channels / notes / visuals | `shipped` (fixtures PATCH) |
| Field AI suggest | `stub` |
| Avatar generate | `stub` |
| Enrich-all / moodboard rebuild / translate / ensure chat prompt | `missing` |
| Docs / knowledge CRUD | `missing` |
| Bilingual `profile_de` | `missing` |
| GEO questions | `out_of_scope` (platform) |
| UX history section | `missing` / deferred |

### Target groups (`knowledge/target-group-migration-map.md`)

| Capability | V3 status |
|------------|-----------|
| List / detail / linked personas | `shipped` |
| Generate personas / suggest TGs | `stub` |
| Sources / knowledge / explorer | `missing` |

### Journeys (`knowledge/journey-migration-map.md` · `journeys-chat-gaps.md`)

| Capability | V3 status |
|------------|-----------|
| List / detail / phase slider / phase edit | `shipped` |
| Generate journey | `stub` |
| Phase/moments AI | `missing` |
| Validate / validation report | `missing` |
| UX-run → journey convert | `missing` |
| Tracking / insights | `missing` |
| Dedicated UX Journey Agent page | `missing` |

### UX Studies (`knowledge/ux-studies.md`)

| Capability | V3 status |
|------------|-----------|
| Study / wave create dialogs | `shipped` |
| Start + Sync poll | `shipped` fixtures · `proxy` api |
| Evaluate | `shipped` · `proxy` |
| Compare picker | `shipped` · `proxy` |
| Soft-Q value/confidence/rationale PATCH | `shipped` |
| Report TipTap + export | `shipped` |
| F-Fragen Copy + Open Chat (context) | `shipped` |
| Statistical n=15 / Testbirds parity | `out_of_scope` (open) |
| Report versioning / artifact CDN | `out_of_scope` (open) |
| V2 Admin Studies UI | N/A — V2 has none; V3 is the UI |

### Chat (`knowledge/chat-migration-map.md` · `chat-surface.md`)

| Capability | V3 status |
|------------|-----------|
| Stream + history | `shipped` fixtures · `partial`/`proxy` when `api` |
| Study/persona/project prefill | `shipped` |
| inspect_website / convert run→journey | `missing` |
| Voice / Tavus | `missing` |
| Public share chat | `missing` |
| Moodboard drawer | `missing` |

### Settings / Auth / Ops

| Capability | V3 status |
|------------|-----------|
| Display name / theme / locale | `shipped` |
| Providers / prompts+test / API catalog | `shipped` (`/settings/admin` · `knowledge/settings-admin-2026.md`) |
| API tokens | `missing` |
| Login / logout (Plexon) | `shipped` Wave 1 · register via Plexon |
| Queue dashboard | `shipped` fixtures (`/queue` · `knowledge/queue-dashboard-2026.md`) |

---

## 3. AI trigger parity

Source V2: `AUDION-v2/knowledge/ai-trigger-buttons-inventory.md`  
V3 registry: `knowledge/ai-workflows.md` · `apps/web/lib/ai-workflows.ts`

| V2 trigger | V3 | Status |
|------------|-----|--------|
| Suggest TGs / personas, research start, generate journey | Buttons + live/`auto` proxy | `proxy` (stub fallback) |
| Generate persona (TG), avatar, field suggest | Live/`auto` proxy | `proxy` (stub fallback) |
| Enrich-all, moodboard rebuild, translate, ensure chat prompt | — | `missing` |
| Easy Setup bootstrap | `/setup` + native bootstrap API | `shipped` |
| Journey phase AI, validate, UX-run convert | — | `missing` |
| UX Journey Agent run UI | — | `missing` (Studies Start can hit API) |
| Prompt test | `/settings/admin/prompts` | `shipped` |
| Chat stream + tools | Fixture / chat-api (`auto`/`api`) | `partial` (live stream; history fixtures) |

Wave 2 goal: replace stubs with live proxy to persona-api / documented `target` paths.

---

## 4. What V3 has that V2 does not (product UI)

- First-class **Studies** workspace (create → start/sync → evaluate → compare → Soft-Q/report → F-Fragen→chat)
- Unified magazine IA (no dual personas-v1/v2 / TG-v1/v2 admin)
- DS primitives for studies: `StatLede`, `DivergingBarList`, `WizardSteps` (`msqdx-ui`)

---

## 5. Platform / secondary (V2 only — `out_of_scope` for core UI parity)

Figma / PowerPoint plugins · Persona Reality VR · GEO / `geo-questions` · PLEXON provisioning · CHECKION audience APIs · Indexing-API · MCP server (87 tools) · EBM journey scripts

These matter if V3 must *replace* the whole platform, not only the research/magazine product UI.

---

## 6. Manual smoke checklist

Run against audion-v3 (`apps/web`, default port **3006**). Paths via `paths.routes.*`.

### A. Fixtures Studies loop (default / `fixtures` \| `auto`)

1. Open `/studies` — list loads; seed **EBM Produktkombinationen** visible.
2. **New study** — create dialog (`WizardSteps`) saves and opens detail.
3. Study detail → **New wave** — wave appears in list.
4. Open seed wave `audion-2026-07-30-mcp` (or new wave).
5. Topbar **Start** → Confirm → status moves toward running; **Sync** / auto-poll updates run dots (`StatusMeterPanel`).
6. **Evaluate** — aggregates / Soft-Q board refresh.
7. Soft-Q: change value, confidence %, rationale → persists (reload wave).
8. Report band: edit TipTap narrative → persists; **Export report** downloads markdown body.
9. **Compare** — pick another wave (or create second) → delta UI.
10. F-Fragen: **Copy** works; **Open in Chat** opens `/chat` with `prompt` + `personaId` + study/wave query (`chatWithContext`).

### B. Optional live API proxy (`NEXT_PERSONA_DATA_SOURCE=api`)

Prereq: AUDION-v2 API up; `NEXT_PERSONA_BACKEND_INTERNAL_URL` set (see `paths.md`).

1. Restart v3 with `api` mode.
2. Studies list/detail load from V2 `/ux-studies` (not only seed fixtures).
3. Wave **Start** → network hits Next `/api/studies/…/start` → V2 orchestrate.
4. **Sync** polls V2 `/sync`; run agent fields update.
5. Evaluate / Compare still succeed against live wave ids.

### C. AI Wave 1 stubs

1. Project audience: Suggest TGs / Suggest personas / Start research / Generate journey — each returns success UI and response includes `stubbed: true` (Network tab or toast/detail).
2. TG detail **Generate with AI** — stub persona(s) appear in fixtures.
3. Persona magazine: field Suggest + avatar Generate — stub payloads; no live enrich/moodboard.
4. Journeys create **Generate with AI** — stub journey entity.

### D. Chat baseline

1. `/chat` — send message; stream completes (fixture NDJSON unless `api`).
2. `/chat/history` — list opens a prior conversation when seeded.
3. Deep-link from Studies (step A.10) pre-fills composer.

### E. Shell smoke

1. Rail: Home, Projects, Personas, Target groups, Journeys, Studies, Chat, Settings.
2. `/settings` — display name / theme / locale persist (localStorage keys in `paths.md`).
3. No `/login` / `/admin/*` routes (expected missing).

**Pass criteria:** A + C + D + E green for demo parity; B green for live Studies orchestration claim.

---

## 7. Priority backlog (build next)

See `knowledge/remaining-gaps.md` for the living P0–P2 list. Summary:

- **P0:** AI Wave 2 live proxy · Chat live-stable + study prefill
- **P1:** Agent surface (or Studies-only contract) · Persona moodboard/docs/enrich · Journey validate + UX-run convert
- **P2:** Auth · Queue · Settings/prompts · Voice/Tavus · Share

---

## 8. What this audit does not replace

No automated E2E covering all V2 admin routes. Fixture mode can look complete while upstream is stubbed/offline. Live product parity requires `NEXT_PERSONA_DATA_SOURCE=api` and running V2 services (API, chat-api, UX Journey Agent as needed).
