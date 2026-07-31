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

## Out of scope

Wiring Bearer into every BFF route · Postgres · scopes/expiry · CHECKION service tokens

## Smoke

```bash
cd apps/web
npx vitest run __tests__/settings-api-tokens.test.tsx __tests__/settings-admin.test.tsx
```
