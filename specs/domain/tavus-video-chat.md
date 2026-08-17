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
| `tavusPersonaId` | Optional Tavus PAL / persona id. Also accepted as `tavus_persona_id` / `pal_id`. |

Editable on the persona magazine profile. Empty string clears to `null`.

## Session

`POST /api/chat/tavus/session` with `{ personaId }`:

1. Load the Audion persona (`storePersonaDetail`).
2. Require `tavusReplicaId` (or `tavusPersonaId` when a PAL already has a default face) — else **400**.
3. Require `TAVUS_API_KEY` — else **503**.
4. `POST {TAVUS_API_BASE}/v2/conversations` with `face_id` + `replica_id` (same value) and optional `pal_id` + `persona_id`.
5. Return `{ stubbed: false, conversationUrl, meetingToken, conversationId, personaId }`.

Never return a stub conversation URL.

## Chat UI

- Persona `/chat` only. Off on public share, target-group ask-all, and `/chat/embed`.
- Video toggle embeds an iframe (`allow="camera; microphone; fullscreen; display-capture"`).
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
5. Tests cover normalize/patch, session errors, and iframe embed.
