# Settings API tokens — 2026-07-31

Personal Bearer tokens (V2 parity) under Settings Admin. Fixture store until product Postgres.

## Specs

- Domain: `specs/domain/settings-api-tokens.md`
- API: `specs/api/settings-tokens.md`

## Surface

| Piece | Path |
|-------|------|
| UI | `/settings/admin/tokens` · `SettingsAdminTokensPanel` |
| Store | `apps/web/lib/fixtures/api-tokens-store.ts` |
| Lib | `apps/web/lib/settings-api-tokens.ts` |
| APIs | `GET/POST /api/settings/tokens` · `DELETE …/tokens/[id]` · `POST …/tokens/verify` |

## Format

- Raw: `paths.apiTokenPrefix` (`audion_`) + 64 hex
- Stored: SHA-256 hash only
- Owner: session user id/email, else `paths.apiTokenFixtureOwnerId` (`local-admin`)

## Bearer on BFF (2026-08-03)

- Middleware (when Plexon is configured): `/api/*` with `Authorization: Bearer audion_…` is allowed when
  1. raw token equals `process.env.AUDION_API_TOKEN`, or
  2. `POST /api/settings/tokens/verify` succeeds (fixture / UI token in Node store).
- Verify route is public (no session) so Edge middleware can validate fixture tokens.
- Env key: `paths.audionApiTokenEnvKey` → `AUDION_API_TOKEN` (see `.env.example`).

## Out of scope

Postgres-backed token store · scopes/expiry · CHECKION service tokens · session impersonation from Bearer

## Smoke

```bash
cd apps/web
npx vitest run __tests__/settings-api-tokens.test.tsx __tests__/settings-admin.test.tsx
```
