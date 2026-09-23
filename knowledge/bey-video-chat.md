# Beyond Presence video chat (AUDION v3)

**Date:** 2026-09-23  
**Specs:** `specs/domain/bey-video-chat.md` · `specs/domain/video-call-providers.md` · `specs/api/chat-video-session.md`  
**Related:** `knowledge/tavus-video-chat.md`

## Purpose

Persona `/chat` Video modality can use **Beyond Presence Managed Agents** as an alternative to Tavus CVI. Phase 1 is Managed Agents only (not Speech-to-Video). The BFF holds `BEY_API_KEY`; the browser receives LiveKit credentials or an iframe URL — never the API key.

## Persona fields

| Contract | Wire aliases on read |
|----------|----------------------|
| `beyAvatarId` | `bey_avatar_id` |
| `beyAgentId` (synced Managed Agent) | `bey_agent_id`, `agent_id` |
| `videoCallProvider` (`tavus` \| `bey` \| null = auto) | `video_call_provider` |
| `tavusLanguage` (`de` / `en`) | Shared spoken-language field with Tavus |

Magazine editor: `apps/web/components/persona-editable-bey.tsx` (next to Tavus). Persistence is JSON payload on the persona row (`DETAIL_ONLY_KEYS`) — no extra Postgres column.

## Provider resolution

Order (`apps/web/lib/video-call/resolve-provider.ts`):

1. Explicit `videoCallProvider` when set and credentials + IDs exist
2. Else BEY when `beyAvatarId`/`beyAgentId` + `BEY_API_KEY`
3. Else Tavus when replica/PAL + `TAVUS_API_KEY`
4. Else 400 `VIDEO_PROVIDER_UNCONFIGURED` (or `*_MISSING` / `*_API_KEY_MISSING`)

Tie-break when both ready: `AUDION_VIDEO_CALL_PROVIDER` (`bey` \| `tavus`, default Tavus).

## Session

Preferred: `POST /api/chat/video/session` (`paths.routes.apiChatVideoSession`)

1. Load persona via `storePersonaDetail`.
2. Resolve provider; for BEY sync Managed Agent from magazine (`syncPersonaBeyAgent` — same spoken prompt builder as Tavus PAL).
3. `POST {BEY_API_BASE}/v1/livekit-rooms` with `agent_id` → `{ id, livekit_url, livekit_token }`.
4. Return `ChatVideoSessionResponse` with `media.kind: 'livekit'`.
5. On 403 LiveKit plan gate (`BEY_LIVEKIT_PLAN`), fall back to iframe `https://bey.chat/{agentId}` (debug/fallback only).
6. `DELETE` with `{ conversationId, provider: 'bey' }` — client disconnect is the end; Phase 1 has no server room-end.

Compat: `POST /api/chat/tavus/session` remains Tavus-only (thin wrapper / unchanged UX for Tavus callers). Chat UI uses the unified video route + `VideoCallPanel`.

## Studio setup (operator)

1. Create / pick a stock or custom avatar in [bey.studio](https://bey.studio); copy avatar UUID → `beyAvatarId`.
2. Set Coolify/server `BEY_API_KEY` (do not commit). Optional `BEY_API_BASE`.
3. Save avatar on the persona magazine; first PATCH/session creates the Managed Agent and writes `beyAgentId`.
4. Optional: set `videoCallProvider: bey` when both Tavus and BEY IDs exist.

## Config

| Key | Role |
|-----|------|
| `BEY_API_KEY` | Server-only (`paths.envBeyApiKey`) |
| `BEY_API_BASE` | Optional; default `https://api.bey.dev` |
| `AUDION_VIDEO_CALL_PROVIDER` | Tie-break when both providers ready |

Never expose the key to the browser. Public share, TG ask-all, and guest `/chat/embed` do not start video (same guardrails as Tavus; `embed=full` ok).

## Compliance

Confirm Beyond Presence EU/region hosting against the customer DPA before production enablement; document the chosen region in the Collection runbook when keys go live.

## Docs

- BEY API: https://docs.bey.dev
- Studio: https://bey.studio
- LiveKit client: `livekit-client` in `VideoCallPanel`
