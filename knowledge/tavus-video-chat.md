# Tavus video chat (AUDION v3)

**Date:** 2026-08-17  
**Spec:** `specs/domain/tavus-video-chat.md`  
**Legacy:** `AUDION-v2/knowledge/tavus-video-chat.md`

## Purpose

Persona `/chat` starts a real Tavus CVI video call. Personas store a Face / replica id (example `r5e781e37a8d`). The Next BFF creates the conversation; the browser only embeds the returned URL.

## Persona fields

| Contract | Wire aliases on read |
|----------|----------------------|
| `tavusReplicaId` | `tavus_replica_id`, `face_id` |
| `tavusPersonaId` (optional PAL) | `tavus_persona_id`, `pal_id` |

Do **not** treat Audion `persona_id` as a Tavus PAL id.

Magazine editor: `apps/web/components/persona-editable-tavus.tsx`. Persistence is JSON payload on the persona row (`DETAIL_ONLY_KEYS`) — no extra Postgres column.

## Session

`POST /api/chat/tavus/session` (`paths.routes.apiChatTavusSession`)

1. Load persona via `storePersonaDetail` (Postgres, then fixture fallback — staging DB often lacks demo ids such as `persona-alex-morgan`).
2. 400 `TAVUS_REPLICA_MISSING` if no replica (and no PAL) id — chat links to the persona profile.
3. Saving a replica on a fixture-only id **upserts** that persona into Postgres so the next session reads it.
3. 503 if `TAVUS_API_KEY` unset.
4. `POST {TAVUS_API_BASE}/v2/conversations` with both current (`face_id` / `pal_id`) and legacy (`replica_id` / `persona_id`) keys.
5. Return `{ stubbed: false, conversationUrl, meetingToken, conversationId, personaId }`.

Client: `apps/web/lib/tavus/client.ts`. Embed: `apps/web/components/tavus-video-panel.tsx`.

## Config

| Key | Role |
|-----|------|
| `TAVUS_API_KEY` | Server-only (`paths.envTavusApiKey`) |
| `TAVUS_API_BASE` | Optional; default `paths.tavusApiDefaultBase` (`https://tavusapi.com`) |

Never expose the key to the browser. Public share, TG ask-all, and `/chat/embed` do not start Tavus.

## Docs

- [Create conversation](https://docs.tavus.io/api-reference/conversations/create-conversation)
- [Embed CVI](https://docs.tavus.io/sections/integrations/embedding-cvi)
