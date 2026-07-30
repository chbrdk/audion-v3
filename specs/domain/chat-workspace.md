# Chat Workspace

**Status:** Accepted — 2026-07-29 · Open surface on DS 2026-07-29  
**Routes:** `/chat`, `/chat/history`  
**Contracts:** `packages/contracts/src/chat.ts`  
**Knowledge:** `knowledge/chat-surface.md`, `knowledge/chat-migration-map.md`, `knowledge/journeys-chat-gaps.md`, `knowledge/paths.md`  
**DS chrome:** `msqdx-ui/specs/domain/msqdx-ui-chat-chrome.md` · `.chat-panel-open`  
**ECHON reference:** `msqdx-echon/v3/apps/web-ui/src/chat/` (`ChatPanel`, `ChatAnswer`, Overlay, Thinking)  
**Legacy:** AUDION-v2 `/admin/chat`, `/chat` · `knowledge/admin-chat-layout.md` · `chat-share-paths.md`

## Purpose

Persona-scoped conversational surface: full-page editorial chat on DS open chrome + streaming from chat-api — without Panel/card chrome.

## Surfaces

| Route | Role |
|-------|------|
| `/chat` | Primary chat (authenticated app shell) |
| `/chat?personaId=&projectId=` | Deep-link / share-style entry (MVP may require auth; public share later) |
| `/chat?prompt=&personaId=&studyId=&waveId=&studyName=&waveKey=` | F-Fragen / study hang: composer prefill + persona select (`lib/chat/prefill.ts`) |
| `/chat/history` | Simple conversation list |

## Composition (`/chat`)

| Region | Treatment |
|--------|-----------|
| Shell topbar | No page title; persona `Select` in `leading` (`.topbar-brand`); History in `topbar-right`; visually-hidden `h1` “Chat” |
| Panel | `.chat-panel.chat-panel-open` (+ thin `.audion-chat-panel` for shell offset) |
| Message stack | Scroll; assistant via `ChatAnswer`; user `.chat-text` display type, right-aligned |
| Empty | `@msqdx/ui` `EmptyState` + `.chat-empty` |
| Streaming / busy | `LoadingText` |
| Errors | `Alert tone="error"` |
| Composer | Underline `Textarea.chat-composer`; expands on hover/focus/`is-expanded`; icon send `.chat-send.chat-send-icon` |
| Optional | Stop generation while streaming |

## Shell integration

- Rail item **Chat** — path `paths.routes.chat`
- Active rail for `/chat*`
- Product CSS only for persona field, history link, `--chat-panel-open-min-height`

## Data / runtime

- Stream + message POST against chat-api (URL from central config — never hardcode)
- Next proxy under `paths.routes.apiChat*` when browser must avoid CORS / hide keys
- Persona context: load summary via existing persona contracts when `personaId` present
- Fixture mode: canned transcript + fake stream for UI tests without chat-api

## Non-goals (MVP)

- Moodboard drawer
- Docs / knowledge upload in composer
- Tavus video / Whisper voice
- Public unauthenticated share (middleware `PUBLIC_PATHS`) — follow-on
- Full adaptive-prompt admin / Qdrant debug panels
- Journey-in-chat context picker (follow-on once journeys ship)

## Acceptance

1. `/chat` renders composer + empty/loading/error with DS primitives + `.chat-panel-open`.
2. With `personaId`, topbar shows that persona; messages stream from chat-api or fixture fake-stream.
3. History route lists conversations and opens `/chat` with the right id/query.
4. Chat visual chrome comes from `@msqdx/ui` (`chat.css`); answer code reused from ECHON, not reinvented.
5. No hardcoded chat/API URLs — `paths.ts` + runtime config + `knowledge/paths.md`.
6. Unit/smoke: open classes + fixture stream smoke (`chat-panel.test.tsx`).
