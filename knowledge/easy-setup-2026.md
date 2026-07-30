# Easy Setup (Project + TG + Persona) — 2026-07-30

Magazine bootstrap flow ported from V2 `POST /projects/bootstrap` + `/admin/setup` into audion-v3 **natively** (fixtures + OpenAI assist; no V2 API).

## Surfaces

| Kind | Path | Constant |
|------|------|----------|
| UI | `/setup` | `paths.routes.setup` |
| API | `POST /api/projects/bootstrap` | `paths.routes.apiProjectsBootstrap` |
| Lib | `apps/web/lib/easy-setup.ts` | — |
| URL fetch | `apps/web/lib/easy-setup-url.ts` | — |
| Contracts | `@audion-v3/contracts` `ProjectEasySetupRequest` / `ProjectEasySetupResponse` | — |

Entry points: **Easy setup** tile on `/projects`, home CTA + body link.

## Request / response

**Body:** `customer_name`, `about`, optional `website_url`, optional `project_name`, optional `output_locale`.

**Response (201):** `{ stubbed, project, targetGroup, persona, websiteExcerptIncluded }`.

## Flow

1. Validate required fields.
2. Optional website fetch (SSRF-safe: http/https only, block private/localhost hosts). Caps in `paths.easySetupUrl*`.
3. `storeCreateProject` with description + company context (about + excerpt).
4. If session + Plexon configured → `registerAudionProjectOnPlexon` (same as project create).
5. Native AI when `shouldPreferAiNative()`:
   - `project.suggest_target_groups` (count 1)
   - `persona.generate_batch` (count 1)
6. Else deterministic stub seeds from customer/about.
7. Create TG + persona, link persona on TG; derived project counts refresh from stores.

## Env

| Key | Role |
|-----|------|
| `NEXT_AI_RUNTIME` | `stub` \| `native` \| `auto` (default) |
| `OPENAI_API_KEY` | Enables native in `auto` / required for `native` |
| `PLEXON_AUTH_URL` / `PLEXON_SERVICE_SECRET` | Optional project origin registration |

## Smoke

```bash
cd apps/web
npx vitest run __tests__/easy-setup.test.ts __tests__/easy-setup.test.tsx
```

Manual: open `/setup` → fill customer + about → Create → deep links to project / TG / persona.

## Out of scope

Multi-persona / multi-TG batch · Settings admin · Queue · Product Postgres
