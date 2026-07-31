# Settings Admin hub — 2026-07-31

Magazine ops surface for providers status, assist prompt edit/test, and BFF route catalog. No API-token CRUD and no OpenAPI iframe (v3 has none).

## Routes

| UI | Path | Constant |
|----|------|----------|
| Hub | `/settings/admin` | `paths.routes.settingsAdmin` |
| Providers | `/settings/admin/providers` | `settingsAdminProviders` |
| Prompts | `/settings/admin/prompts` | `settingsAdminPrompts` |
| API docs | `/settings/admin/api-docs` | `settingsAdminApiDocs` |

Entry: **Admin** section on `/settings` → Open settings admin.

## APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/api/settings/providers` | Read-only provider/runtime flags |
| GET | `/api/settings/prompts` | List assist templates (bodies + override flag) |
| GET | `/api/settings/prompts/[id]` | Single resolved template |
| PUT | `/api/settings/prompts/[id]` | Upsert global fixture override |
| DELETE | `/api/settings/prompts/[id]` | Reset override → base catalog |
| POST | `/api/settings/prompts/test` | Run assist (native) or stub payload |

Lib: `apps/web/lib/settings-admin.ts` · prompts: `apps/web/lib/ai/prompts/*` · contracts: `@audion-v3/contracts` settings-admin types.  
Spec: `specs/domain/prompt-templating.md` · `specs/api/settings-prompts.md` · `knowledge/v2-prompt-templating-parity-2026-07-31.md`

Providers never return secret values — only `configured` booleans + model names from env/paths.

## Smoke

```bash
cd apps/web
npx vitest run __tests__/settings-admin.test.ts __tests__/settings-admin.test.tsx __tests__/prompt-templating.test.ts __tests__/projects-settings.test.tsx
```

Manual: `/settings` → Admin → Providers / Prompts (edit + Test) / API docs (health JSON).

## Out of scope

API token CRUD · full V2 PromptBuilder chrome · password change · brand color · per-project Postgres overrides
