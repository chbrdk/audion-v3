# Settings API tokens

**Status:** Accepted — 2026-07-31  
**UI:** `/settings/admin/tokens`  
**Paths:** `paths.routes.apiSettingsTokens*` · `knowledge/paths.md`

## Endpoints

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/settings/tokens` | List current owner tokens (no secrets) |
| `POST` | `/api/settings/tokens` | Create token; body `{ name?: string }`; returns raw `token` once |
| `DELETE` | `/api/settings/tokens/[tokenId]` | Revoke; `204` or `{ ok: true }` |
| `POST` | `/api/settings/tokens/verify` | Optional smoke: Bearer → `{ ok, ownerId }` or 401 |

## List response

```ts
{ items: Array<{ id: string; name: string | null; createdAt: string }> }
```

## Create response

```ts
{ id: string; name: string | null; createdAt: string; token: string }
```

## Owner

- Prefer Plexon/session `user.id` / email when `auth()` present
- Else fixture owner `local-admin` (matches open-when-unconfigured policy)

## Errors

| Status | When |
|--------|------|
| 400 | Invalid empty create body invalid (rare) |
| 401 | Verify with missing/invalid Bearer |
| 404 | Revoke unknown id |

## Acceptance

1. Paths from `paths.routes` only.
2. Hash never appears in JSON responses.
3. Verify succeeds only for unrevoked raw token.
