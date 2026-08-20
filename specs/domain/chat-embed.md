# Chat embed (EQC / public guest)

**Status:** Spec locked 2026-08-11  
**Owner:** AUDION v3  
**Consumers:** Plexon EQC magazine + public `/share/quick-check/[token]` via `@msqdx/ui` `ChatOverlay` iframe  
**Companions:** `knowledge/paths.md` · Plexon `knowledge/eqc-persona-chat.md` · `specs/domain/chat-workspace.md`

## Purpose

Chrome-stripped Audion persona chat for iframe hosts. Audion remains SoT for prompts, stream, and share persona load (`lib/chat/share-persona.ts` → **Audion v3 Postgres store first** regardless of `NEXT_PERSONA_DATA_SOURCE`, legacy FastAPI `/public` for UUID personas when not in fixtures-only mode, then demo fixtures). Hosts only supply chrome + deep-link fallback.

Guest `/chat?personaId=&projectId=` deep-links use the same share resolver and are public (no Plexon login) per `lib/chat/share-public-routes.ts`.

## Route

| Item | Value |
|------|--------|
| Path | `/chat/embed` (`paths.routes.chatEmbed`) |
| Query | `personaId` (required), `projectId` (required), `theme` (optional, host `data-theme` id), `embed=1` (guest) or `embed=full` (EQC logged-in overlay) |
| Auth | Public when Plexon federation auth is on (middleware allowlist) |
| CSP | `Content-Security-Policy: frame-ancestors …` on embed route only |

`frame-ancestors` allowlist: `AUDION_CHAT_EMBED_FRAME_ANCESTORS` (space-separated origins) **or** derive from `NEXT_PUBLIC_PLEXON_URL` / `PLEXON_AUTH_URL` origin. Never hardcode host FQDNs in components.

### Theme sync (host light/dark)

1. Host reads `document.documentElement.getAttribute('data-theme')` and passes `theme` on the embed URL.
2. While the overlay is open, host posts `assistant:theme` `{ themeId }` (`source: plexon-assistant-host`) — same protocol as Central Assistant embed.
3. Audion `/chat/embed` applies allowlisted theme ids on **`html[data-theme]`** via `ChatEmbedThemeSync` (`lib/chat/embed-theme.ts`), not only on the embed wrapper div.

## Guest budget (server-enforced)

Unauthenticated stream requests are guest sessions. Constants live in `apps/web/lib/chat/guest-budget.ts` (documented in `knowledge/paths.md`):

| Limit | Default |
|-------|---------|
| Max user turns / session | `5` (`GUEST_CHAT_MAX_USER_TURNS`) |
| Max chars / message | `800` (`GUEST_CHAT_MAX_CHARS`) |
| Soft session TTL | `30 min` (`GUEST_CHAT_TTL_MS`) |

- Session key: cookie `audion_guest_chat` + `personaId` + `projectId`.
- Gate: `POST /api/chat/stream` — reject over budget with stable `code` (`GUEST_BUDGET_EXHAUSTED` → 429, `GUEST_MESSAGE_TOO_LONG` → 400, `GUEST_SESSION_EXPIRED` → 403).
- Authenticated full `/chat` is unchanged (no guest budget).
- Embed UI (`embed=1` guest): remaining-turns hint; disable send at 0; no voice / video / inspect / moodboard / history / TG mode.
- Embed UI (`embed=full`): same guest text budget; **enables** persona `/chat` modalities — Tavus video (`POST /api/chat/tavus/session` public on embed), voice toggle (stub), moodboard strip, website inspect/convert. No history / TG / persona picker. Use from **logged-in EQC overlay** only; public Quick Check share keeps `embed=1`.

## Out of scope

- Unlimited authenticated embed
- TG ask-all inside public overlay
- Merging into Platform Assistant FAB
