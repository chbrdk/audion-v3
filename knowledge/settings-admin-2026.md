# Settings Admin hub — 2026-07-30

Magazine ops surface for providers status, assist prompt test, and BFF route catalog. No API-token CRUD and no OpenAPI iframe (v3 has none).

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
| GET | `/api/settings/prompts` | List `ASSIST_TEMPLATES` ids |
| POST | `/api/settings/prompts/test` | Run assist (native) or stub payload |

Lib: `apps/web/lib/settings-admin.ts` · contracts: `@audion-v3/contracts` settings-admin types.

Providers never return secret values — only `configured` booleans + model names from env/paths.

## Smoke

```bash
cd apps/web
npx vitest run __tests__/settings-admin.test.ts __tests__/settings-admin.test.tsx __tests__/projects-settings.test.tsx
```

Manual: `/settings` → Admin → Providers / Prompts (Test) / API docs (health JSON).

## Out of scope

API token CRUD · V2 PromptBuilder edit/persist · password change · brand color
