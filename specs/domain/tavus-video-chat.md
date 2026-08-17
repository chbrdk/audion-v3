# Tavus video chat (CVI)

**Status:** Accepted — 2026-08-17  
**Contracts:** `PersonaDetail.tavusReplicaId` · `ChatTavusSessionResponse`  
**Knowledge:** `knowledge/tavus-video-chat.md` · `knowledge/paths.md`  
**Legacy:** AUDION-v2 `knowledge/tavus-video-chat.md`

## Purpose

Persona chat can start a real-time **Tavus Conversational Video Interface** call with the persona’s Face (replica). The API key never leaves the Next BFF.

## Persona fields

| Field | Role |
|-------|------|
| `tavusReplicaId` | **Required for video.** Tavus Face / replica id (e.g. `r5e781e37a8d`). Also accepted on read as `tavus_replica_id` / `face_id`. |
| `tavusPersonaId` | Tavus PAL id. **Synced from the magazine** when a replica is set (create or JSON-Patch `?target=live`). Manual paste still allowed; the next sync overwrites that PAL’s `system_prompt`. Also accepted as `tavus_persona_id` / `pal_id`. |

Editable on the persona magazine profile. Empty string clears to `null`.

## Session

`POST /api/chat/tavus/session` with `{ personaId }`:

1. Load the Audion persona (`storePersonaDetail`).
2. Require `tavusReplicaId` (or `tavusPersonaId` when a PAL already has a default face) — else **400**.
3. Require `TAVUS_API_KEY` — else **503**.
4. Upsert the Tavus PAL from magazine data (see PAL sync) and persist `tavusPersonaId`.
5. End leftover **active** Tavus conversations for this API key (names with `paths.tavusConversationNamePrefix`, or the same `face_id`) via `POST {TAVUS_API_BASE}/v2/conversations/{id}/end`. Plans often allow only **one** concurrent call — retries 400 with `User has reached maximum concurrent conversations` otherwise.
6. `POST {TAVUS_API_BASE}/v2/conversations` with `face_id` and optional `pal_id` only (do **not** also send `replica_id` / `persona_id` — Tavus treats them as aliases and 400s). Include `properties.participant_absent_timeout` / `participant_left_timeout` / `max_call_duration` from `paths` so idle rooms free the concurrency slot.
7. If create still 400s on the concurrent-conversation limit, end remaining active conversations and retry **once**.
8. Return `{ stubbed: false, conversationUrl, meetingToken, conversationId, personaId }`.
9. `DELETE /api/chat/tavus/session` `{ conversationId }` ends that room (chat video off / unmount).

Never return a stub conversation URL.

## PAL sync (Audion SSOT)

When `tavusReplicaId` is set **and** `TAVUS_API_KEY` is present:

1. Build a spoken `system_prompt` from magazine identity (name, role, bio, goals, frustrations, communication style, journey dos/donts) — not traits/tiles/knowledge dumps. Cap `paths.tavusPalSystemPromptMaxChars`.
2. If `tavusPersonaId` is set: `PATCH {TAVUS_API_BASE}/v2/pals/{id}?target=live` (`system_prompt`, `pal_name`, `default_face_id`).
3. Else (or PATCH 404): `POST {TAVUS_API_BASE}/v2/pals` with `pipeline_mode: full` and `default_face_id`.
4. Write `pal_id` back onto the Audion persona.
5. Persona PATCH still **200** if Tavus sync fails (Audion save wins). Chat session retries sync before create.

Triggers: `PATCH /api/personas/{id}`, `POST /api/personas` (when replica present), and `POST /api/chat/tavus/session`.

`conversational_context` on the conversation is **session-only** (stay in character / research call) — identity lives on the PAL.

Do **not** create a new PAL on every video click when `tavusPersonaId` already exists. Knowledge/docs → Tavus `document_ids` is out of scope.

## Chat UI

- Persona `/chat` only. Off on public share, target-group ask-all, and `/chat/embed`.
- Video toggle embeds an iframe (`allow="camera; microphone; fullscreen; display-capture"`). Turning video off ends the Tavus conversation.
- Optional `meetingToken` → `conversationUrl?t=TOKEN`.
- No MUI; product CSS + `@msqdx/ui` chrome.

## Config

| Env | Role |
|-----|------|
| `TAVUS_API_KEY` | Server-only. Required for video. |
| `TAVUS_API_BASE` | Optional; default `https://tavusapi.com` (`paths.tavusApiDefaultBase`). |

Documented in `knowledge/paths.md`. Never hardcode the base in components.

## Acceptance

1. Persona profile can save a replica id such as `r5e781e37a8d`.
2. Video toggle with replica + API key embeds a live CVI iframe (not a stub link).
3. Missing replica → 400 with a human-readable error; missing key → 503.
4. Share / TG / embed do not start Tavus.
5. Tests cover normalize/patch, PAL prompt/upsert, session errors, and iframe embed.
