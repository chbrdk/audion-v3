# API tokens (Settings Admin)

**Status:** Accepted — 2026-07-31  
**UI:** `/settings/admin/tokens`  
**Knowledge:** `knowledge/settings-admin-2026.md`, `knowledge/settings-api-tokens-2026.md`  
**Reference:** AUDION-v2 `ApiToken` + `/auth/tokens` + profile API tokens band

## Purpose

Personal Bearer tokens for MCP / integrations / scripted BFF access. Fixture-backed until product Postgres; same UX as V2 (create once, hash stored, revoke).

## Model

| Field | Notes |
|-------|--------|
| `id` | Opaque id (`tok-…`) |
| `name` | Optional label |
| `ownerId` | Session user id or `local-admin` when unauthenticated fixtures |
| `tokenHash` | SHA-256 hex of raw token (never returned after create) |
| `createdAt` | ISO timestamp |

**Raw token format:** `audion_` + 64 hex chars (32 random bytes). Shown **once** on create.

## Admin UX

- List tokens (name, createdAt, revoke) — no secrets
- Create with optional name → show raw token + copy + dismiss warning
- Revoke with confirm

## Auth resolution (helper)

`resolveApiTokenOwner(rawBearer)` → `ownerId | null` via hash lookup. Wiring into all BFF routes is **out of scope** this wave (CRUD + helper + optional verify endpoint only).

## Non-goals

- Postgres persistence
- Scopes / expiry / rotation UI
- Password change
- Service tokens (CHECKION inbound) — separate env secrets

## Acceptance

1. Create returns raw token once; list never includes it.
2. Revoke removes row; resolve fails after revoke.
3. Paths only via `paths.ts`.
4. Tests cover store hash, CRUD, and admin panel smoke.
