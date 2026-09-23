# Video call providers (Tavus + Beyond Presence)

**Status:** Accepted — 2026-09-23  
**Contracts:** `PersonaDetail.videoCallProvider` · `beyAvatarId` · `beyAgentId` · `ChatVideoSessionResponse`  
**Related:** `specs/domain/tavus-video-chat.md` · `specs/domain/bey-video-chat.md` · `specs/api/chat-video-session.md`  
**Knowledge:** `knowledge/bey-video-chat.md` · `knowledge/tavus-video-chat.md`

## Purpose

Persona chat FaceTime / video may use **Tavus CVI** or **Beyond Presence Managed Agents**. The BFF picks a provider, never exposes API keys, and returns a provider-neutral session shape for the chat UI.

## Providers

| Id | Product | Phase 1 role |
|----|---------|--------------|
| `tavus` | Tavus Conversational Video Interface | Existing path (`specs/domain/tavus-video-chat.md`) |
| `bey` | Beyond Presence Managed Agents | Alternative (`specs/domain/bey-video-chat.md`) |

Speech-to-Video (avatar-only over a self-hosted voice stack) is **out of scope** for Phase 1.

## Persona fields

| Field | Role |
|-------|------|
| `videoCallProvider` | Optional explicit `tavus` \| `bey`. `null` = auto-resolve. |
| `tavusReplicaId` / `tavusPersonaId` / `tavusLanguage` | Tavus Face / PAL / language (unchanged). |
| `beyAvatarId` | Beyond Presence avatar id (stock or custom). Required for BEY when no agent yet. |
| `beyAgentId` | Managed Agent id. Synced from magazine when avatar is set (create/update). |

Empty string on write clears to `null`.

## Provider resolution

Given persona + env:

1. If `videoCallProvider` is set **and** that provider has API key + required ids → use it.
2. Else if BEY ids (`beyAvatarId` or `beyAgentId`) **and** `BEY_API_KEY` → `bey`.
3. Else if Tavus ids (`tavusReplicaId` or `tavusPersonaId`) **and** `TAVUS_API_KEY` → `tavus`.
4. Else if both providers are fully configured (ids + keys), use `AUDION_VIDEO_CALL_PROVIDER` (`bey` \| `tavus`) as tie-break; default **`tavus`** for backward compatibility.
5. Else **400** with `VIDEO_PROVIDER_UNCONFIGURED` or provider-specific `*_MISSING` / **503** when key missing for an explicit choice.

## Session API

Preferred: `POST` / `DELETE` `/api/chat/video/session` — see `specs/api/chat-video-session.md`.

Compat: existing `/api/chat/tavus/session` remains a thin Tavus-only wrapper (same behaviour as today).

## Chat UI

- One video modality toggle. Starts the resolved provider session.
- Panel renders by media kind: Tavus/BEY **iframe** or BEY **LiveKit** room.
- Same embed guardrails as Tavus: off on guest `embed=1`, TG ask-all, share without `embed=full`.

## Config

| Env | Role |
|-----|------|
| `TAVUS_API_KEY` / `TAVUS_API_BASE` | Tavus (existing) |
| `BEY_API_KEY` / `BEY_API_BASE` | Beyond Presence (`x-api-key`); default base `https://api.bey.dev` |
| `AUDION_VIDEO_CALL_PROVIDER` | Optional tie-break when both providers ready |

Document in `knowledge/paths.md`. Never hardcode bases in components.

## Acceptance

1. Persona with only BEY avatar/agent + key can start video without Tavus ids.
2. Persona with only Tavus replica + key still works (no regression).
3. Explicit `videoCallProvider` wins when that provider is ready.
4. Missing key for explicit provider → 503; missing ids → 400 with stable `code`.
5. Specs inventory lists this file + BEY + API specs.
