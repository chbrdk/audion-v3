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
| `tavusLanguage` (`de` / `en`, optional) | `tavus_language` |

Do **not** treat Audion `persona_id` as a Tavus PAL id.

Magazine editor: `apps/web/components/persona-editable-tavus.tsx`. Persistence is JSON payload on the persona row (`DETAIL_ONLY_KEYS`) — no extra Postgres column.

## Session

`POST /api/chat/tavus/session` (`paths.routes.apiChatTavusSession`)

1. Load persona via `storePersonaDetail` (Postgres, then fixture fallback — staging DB often lacks demo ids such as `persona-alex-morgan`).
2. 400 `TAVUS_REPLICA_MISSING` if no replica (and no PAL) id — chat links to the persona profile.
3. Saving a replica on a fixture-only id **upserts** that persona into Postgres so the next session reads it.
4. 503 if `TAVUS_API_KEY` unset.
5. Upsert PAL from magazine (`POST /v2/pals` or `PATCH …/pals/{id}?target=live`) and persist `tavusPersonaId`.
6. End leftover **active** conversations (`GET …/v2/conversations?status=active`, then `POST …/v2/conversations/{id}/end`) whose name starts with `paths.tavusConversationNamePrefix` or that use the same Face. Tavus plans cap concurrent rooms (often **1**); leaving a prior iframe open 400s the next start with `User has reached maximum concurrent conversations`.
7. `POST {TAVUS_API_BASE}/v2/conversations` with `face_id` and optional `pal_id` only. Do not send legacy `replica_id` / `persona_id` in the same body — [Tavus create conversation](https://docs.tavus.io/api-reference/conversations/create-conversation) treats them as aliases and returns 400. Create payload includes idle timeouts (`paths.tavusParticipantAbsentTimeoutSec` default **90s**, left **30s**) so an unjoined iframe does not occupy the plan’s concurrent slot for Tavus’s 5-minute default. `properties.language` is the **full name** (`German` / `English` from `paths.tavusLanguageNames`) — Tavus rejects `de`/`en`. See [language support](https://docs.tavus.io/sections/conversational-video-interface/language-support).
8. On concurrent-limit 400, end remaining active conversations and retry once.
9. Return `{ stubbed: false, conversationUrl, meetingToken, conversationId, personaId }`.
10. `DELETE /api/chat/tavus/session` `{ conversationId }` — chat video off / panel unmount.

## Face vs PAL

Tavus splits **Face** (look + voice, `face_id` / replica) from **PAL** (how it thinks and talks, `pal_id`). [PAL overview](https://docs.tavus.io/sections/conversational-video-interface/pal/overview) · [Prompting](https://docs.tavus.io/sections/onboarding-guide/prompting-guide).

| Need | What to send |
|------|----------------|
| Talking head on camera | `face_id` only — Tavus uses a **default PAL**. Enough to start CVI. |
| Persona *is* the Audion character | Durable PAL `system_prompt` from Audion identity (name, role, bio, goals, frustrations, communication style, journey dos/donts). Store returned `pal_id` on `tavusPersonaId`. |
| This call only | `conversational_context` (project, study, current question). Tavus **appends** it to the PAL prompt for that room. |

**Do not** create a new PAL on every Video click, and **do not** dump the full Audion JSON (traits, tiles, knowledge entries, documents) into `conversational_context` (we cap at 1500 chars; spoken CVI wants a short identity prompt).

**Sync:** Audion stays SSOT. With a replica + `TAVUS_API_KEY`, persona PATCH/create and chat session upsert `POST/PATCH /v2/pals?target=live` (`system_prompt` from magazine including speak-German/English from `tavusLanguage`, `default_face_id` = replica) and write `pal_id` back to `tavusPersonaId`. Persona save still succeeds if Tavus fails. Knowledge/docs → Tavus `document_ids` later.

Unset `tavusLanguage` infers from bio/location (umlauts / Deutschland / Germany / Österreich / Schweiz → German). Magazine toggle Deutsch / English persists `de` / `en`. Helper: `paths.tavusPalLanguagePath`.

A pasted `tavusPersonaId` is the PAL we **update** on the next sync — not a frozen Maker prompt.

## Config

| Key | Role |
|-----|------|
| `TAVUS_API_KEY` | Server-only (`paths.envTavusApiKey`) |
| `TAVUS_API_BASE` | Optional; default `paths.tavusApiDefaultBase` (`https://tavusapi.com`) |

Never expose the key to the browser. Public share, TG ask-all, and `/chat/embed` do not start Tavus.

## Docs

- [Create conversation](https://docs.tavus.io/api-reference/conversations/create-conversation)
- [Language support](https://docs.tavus.io/sections/conversational-video-interface/language-support) (`properties.language` = full name)
- [List conversations](https://docs.tavus.io/api-reference/conversations/get-conversations)
- [End conversation](https://docs.tavus.io/api-reference/conversations/end-conversation)
- [Create PAL](https://docs.tavus.io/api-reference/pals/create-pal)
- [Patch PAL](https://docs.tavus.io/api-reference/pals/patch-pal) (`?target=live`)
- [Prompting](https://docs.tavus.io/sections/onboarding-guide/prompting-guide)
- [Embed CVI](https://docs.tavus.io/sections/integrations/embedding-cvi)
