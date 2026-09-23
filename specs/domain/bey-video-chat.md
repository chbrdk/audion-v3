# Beyond Presence video chat (Managed Agents)

**Status:** Accepted — 2026-09-23  
**Contracts:** `PersonaDetail.beyAvatarId` · `beyAgentId` · `ChatVideoSessionResponse`  
**Knowledge:** `knowledge/bey-video-chat.md` · `knowledge/paths.md`  
**Providers:** `specs/domain/video-call-providers.md`

## Purpose

Persona chat can start a real-time **Beyond Presence Managed Agent** call (avatar + managed STT/LLM/TTS). The API key never leaves the Next BFF. Audion magazine identity remains SSOT via agent `system_prompt` sync (mirror of Tavus PAL sync).

## Persona fields

| Field | Role |
|-------|------|
| `beyAvatarId` | **Required to create/sync an agent.** Studio avatar id (UUID). Also accepted as `bey_avatar_id` / `avatar_id` when unambiguous. |
| `beyAgentId` | Managed Agent id. Synced from magazine when avatar is set. Manual paste allowed; next sync overwrites that agent’s `system_prompt` / `avatar_id`. Also `bey_agent_id` / `agent_id`. |

Language reuses `tavusLanguage` (`de` / `en`) for spoken agent language in Phase 1 (same magazine toggle).

## Agent sync (Audion SSOT)

When `beyAvatarId` is set **and** `BEY_API_KEY` is present:

1. Build spoken `system_prompt` from the same magazine identity builder as Tavus (`buildTavusPalSystemPrompt` / shared spoken prompt), capped at `paths.beyAgentSystemPromptMaxChars` (≤ 10000 BEY limit; default 4000).
2. If `beyAgentId` is set: `PATCH {BEY_API_BASE}/v1/agents/{id}` with `name`, `avatar_id`, `system_prompt`, `language` (`de` / `en`), `max_session_length_minutes` from paths.
3. Else: `POST {BEY_API_BASE}/v1/agents` with the same fields; persist returned `id` as `beyAgentId`.
4. Persona PATCH still **200** if BEY sync fails (Audion save wins). Video session retries sync before create.

Triggers: `PATCH` / `POST` personas (when avatar present), and `POST /api/chat/video/session` when provider is `bey`.

Do **not** create a new agent on every video click when `beyAgentId` exists.

## Session

`POST /api/chat/video/session` with `{ personaId }` when resolved provider is `bey`:

1. Load persona; sync agent; require `beyAgentId` (after sync) — else **400** `BEY_AVATAR_MISSING` / `BEY_AGENT_MISSING`.
2. Require `BEY_API_KEY` — else **503**.
3. Prefer `POST {BEY_API_BASE}/v1/calls` (LiveKit credentials; Growth+). Docs may still list `/v1/livekit-rooms` as alias — client tries both. On **201**, return media `{ kind: 'livekit', url: livekit_url, token: livekit_token }` and `conversationId` = call/conversation `id`.
4. On **403** plan upgrade (programmatic calls / LiveKit not on plan): fall back to iframe media `{ kind: 'iframe', url: https://bey.chat/{agentId} }` with `conversationId` null. Documented in knowledge.
5. On **429** concurrency: return 429 with human-readable detail (operator ends other sessions in Studio).
6. Never return a stub conversation URL.

`DELETE /api/chat/video/session` `{ conversationId, provider?: 'bey' }`:

- LiveKit: client disconnects the room; BFF may no-op (BEY has no public “end room” in Phase 1) and returns `{ ok: true }`.
- iframe: unmount only; DELETE is a no-op success.

## Chat UI

- `VideoCallPanel` connects LiveKit Client SDK when `kind === 'livekit'` (`livekit-client`), or embeds iframe when `kind === 'iframe'` (`allow="camera; microphone; fullscreen; display-capture"`).
- Turning video off disconnects / unmounts and calls DELETE when `conversationId` present.

## Config

| Env | Role |
|-----|------|
| `BEY_API_KEY` | Server-only. Header `x-api-key`. |
| `BEY_API_BASE` | Optional; default `https://api.bey.dev`. |

## Compliance

Beyond Presence documents EU data residency and GDPR options for enterprise. Operators must confirm plan/region in Studio; Audion does not store call media.

## Acceptance

1. Magazine can save `beyAvatarId`; session sync creates/updates agent and persists `beyAgentId`.
2. Video toggle with avatar + key starts LiveKit or iframe (not a stub).
3. Missing avatar/agent → 400 with `code`; missing key → 503.
4. Guest embed / TG ask-all do not start BEY; `embed=full` may.
5. Tests cover normalize/patch, agent upsert, session errors, panel kinds, provider resolution.
