# Settings Admin hub — 2026-07-31

Magazine ops surface for providers status, assist prompt edit/test, API tokens, and BFF route catalog. No OpenAPI iframe (v3 has none).

## Routes

| UI | Path | Constant |
|----|------|----------|
| Hub | `/settings/admin` | `paths.routes.settingsAdmin` |
| Providers | `/settings/admin/providers` | `settingsAdminProviders` |
| Prompts | `/settings/admin/prompts` | `settingsAdminPrompts` — Prompt Builder workspace |
| API tokens | `/settings/admin/tokens` | `settingsAdminTokens` |
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
| GET | `/api/settings/persona-prompts` | List persona chat prompts |
| GET/PUT/DELETE | `/api/settings/persona-prompts/[id]` | Persona system prompt CRUD |
| GET | `/api/settings/tokens` | List API tokens (no secrets) |
| POST | `/api/settings/tokens` | Create token (raw once) |
| DELETE | `/api/settings/tokens/[id]` | Revoke token |
| POST | `/api/settings/tokens/verify` | Verify Bearer → ownerId |

Lib: `apps/web/lib/settings-admin.ts` · `settings-api-tokens.ts` · prompts: `apps/web/lib/ai/prompts/*` · contracts: `@audion-v3/contracts` settings-admin types.  
Spec: `specs/domain/prompt-templating.md` · `specs/api/settings-prompts.md` · `specs/domain/settings-api-tokens.md` · `knowledge/settings-api-tokens-2026.md`

Providers never return secret values — only `configured` booleans + model names from env/paths.

## Smoke

```bash
cd apps/web
npx vitest run __tests__/settings-admin.test.ts __tests__/settings-admin.test.tsx __tests__/prompt-templating.test.ts __tests__/settings-api-tokens.test.tsx __tests__/projects-settings.test.tsx
```

Manual: `/settings` → Admin → Providers / Prompts / API tokens / API docs.

## Out of scope

Password change · brand color · per-project Postgres overrides · Bearer gate on all BFF routes
