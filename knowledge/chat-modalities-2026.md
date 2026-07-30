# Chat modalities — audion-v3 (P2, Auth deferred)

**Date:** 2026-07-30  
**Status:** Magazine chat modalities wave  
**Related:** `knowledge/chat-surface.md` · `knowledge/journeys-chat-gaps.md` · V2 share/moodboard/inspect/Tavus

## Product goal

Extend editorial `/chat` with:

1. **Public share** — `/chat?personaId=&projectId=` (token in query; no auth)
2. **Moodboard strip** — read-only tiles from persona visuals / share moodboard API
3. **inspect_website HITL** — `tool_proposed` → Approve/Deny → progress → complete
4. **Convert** — from `tool_complete` → journey via `POST /api/journeys/from-ux-run` (`source: chat_inspect`)
5. **Voice / Video hooks** — icon toggles left of the composer; Moodboard / Share / History topbar flyouts; stubs + optional live BFF (Tavus **off** on public share)

## Stream events (NDJSON)

| type | Role |
|------|------|
| `delta` / `done` / `error` | Text reply (existing) |
| `tool_proposed` | HITL card (inspect_website) |
| `tool_started` / `tool_progress` | After approve |
| `tool_complete` | Summary + optional `convert` payload |
| `tool_denied` | After deny |

Decision: `POST /api/chat/tool-call/decision/[callId]` with `{ decision: 'approve' \| 'deny' }`.

## Paths

Central in `apps/web/lib/paths.ts`: `chatShare`, `apiChatSharePersona`, `apiChatShareMoodboard`, `apiChatToolDecision`, `apiChatTavusSession`, `apiChatVoiceStream`.

## Auth note

Live Tavus / voice / public persona may 401 until the Auth stream lands. Fixtures work without auth.

## Deferred

Full Whisper mic UI · polished Tavus iframe · live history list · citations hydrate
