# Chat Workspace

**Status:** Accepted — 2026-07-29 · Open surface on DS 2026-07-29  
**Routes:** `/chat`, `/chat/history`  
**Contracts:** `packages/contracts/src/chat.ts`  
**Knowledge:** `knowledge/chat-surface.md`, `knowledge/chat-migration-map.md`, `knowledge/journeys-chat-gaps.md`, `knowledge/paths.md`, `knowledge/tavus-video-chat.md`  
**DS chrome:** `msqdx-ui/specs/domain/msqdx-ui-chat-chrome.md` · `.chat-panel-open`  
**ECHON reference:** `msqdx-echon/v3/apps/web-ui/src/chat/` (`ChatPanel`, `ChatAnswer`, Overlay, Thinking)  
**Legacy:** AUDION-v2 `/admin/chat`, `/chat` · `knowledge/admin-chat-layout.md` · `chat-share-paths.md`

## Purpose

Persona-scoped conversational surface: full-page editorial chat on DS open chrome + streaming from chat-api — without Panel/card chrome.

## Surfaces

| Route | Role |
|-------|------|
| `/chat` | Primary chat (authenticated app shell) — default **persona** mode |
| `/chat?personaId=&projectId=` | Deep-link / share-style entry (MVP may require auth; public share later) |
| `/chat?prompt=&personaId=&studyId=&waveId=&studyName=&waveKey=` | F-Fragen / study hang: composer prefill + persona select (`lib/chat/prefill.ts`) |
| `/chat?targetGroupId=` | **Target-group ask-all** mode — one question → N persona answers side by side |
| `/chat/history` | Simple conversation list (persona conversations) |

## Composition (`/chat`)

| Region | Treatment |
|--------|-----------|
| Shell topbar | No page title; mode control + persona **or** target-group `Select` in `leading` (`.topbar-brand`); History in `topbar-right` (persona mode); visually-hidden `h1` “Chat” |
| Panel | `.chat-panel.chat-panel-open` (+ thin `.audion-chat-panel` for shell offset) |
| Message stack | Scroll; assistant via `ChatAnswer`; user `.chat-text` display type, right-aligned |
| Empty | `@msqdx/ui` `EmptyState` + `.chat-empty` |
| Streaming / busy | `LoadingText` |
| Errors | `Alert tone="error"` |
| Composer | Underline `Textarea.chat-composer`; expands on hover/focus/`is-expanded`; icon send `.chat-send.chat-send-icon` |
| Attachments | Persona only: image attach + DOCX attach; pending thumbs/chips; A/B when exactly 2 images (`chat-image-attachments.md`, `chat-document-attachments.md`) |
| Optional | Stop generation while streaming |

## Target-group ask-all (Phase TG)

**Job:** One question to every linked persona of a target group; compare answers side by side. Not a shared multi-user thread.

| Rule | Value |
|------|--------|
| Cap | `MAX_TG_CHAT_PERSONAS = 10` (first N linked personas) |
| Transport | Client fan-out: N× existing `POST /api/chat/stream` with per-persona `personaId` (no TG aggregator API) |
| Interaction | Round-based: user question once → response **card grid**; stack further rounds |
| Prompt | One-shot per round (no prior TG answers in stream history for MVP) |
| Disabled in TG | Voice / video / inspect / attachments / share / moodboard |

| Entry | Topbar mode **Zielgruppe** + TG select; CTA from TG detail → `/chat?targetGroupId=` |
| Persistence | Ephemeral UI rounds (not history list) for MVP |

### TG composition

| Region | Treatment |
|--------|-----------|
| Topbar | Mode select (Persona \| Zielgruppe) + TG `Select` + persona count |
| Body | Stack of rounds: user question (`.chat-text`) → grid of persona cards |
| Card | Name/role label + `ChatAnswer` / `LoadingText` / error |
| Empty | Pick TG or “no linked personas” |
| Composer | Same underline composer; send fans out to all slots |

### Keep / reshape / drop (vs AUDION-v2 `/admin/chat`)

| | |
|--|--|
| **Keep** | Ask-all job, fan-out, cap ~10, side-by-side cards, round stack |
| **Reshape** | Editorial topbar + magazine grid on DS open chrome; deep-link + TG detail CTA |
| **Drop** | MUI Tabs/Paper admin monolith; mixing TG grid into persona thread |

## Shell integration

- Rail item **Chat** — path `paths.routes.chat`
- Active rail for `/chat*`
- Product CSS only for persona/TG field, history link, `--chat-panel-open-min-height`, TG response grid

## Data / runtime

- Stream + message POST against chat-api (URL from central config — never hardcode)
- Next proxy under `paths.routes.apiChat*` when browser must avoid CORS / hide keys
- Persona context: load summary via existing persona contracts when `personaId` present
- TG context: load detail via target-group contracts when `targetGroupId` present; members from `linkedPersonas`
- Fixture mode: canned transcript + fake stream for UI tests without chat-api

## Video (Tavus CVI)

Persona mode only (off on public share, TG, and embed). Composer **Video** toggle starts `POST /api/chat/tavus/session` with the selected Audion `personaId`. The persona must have `tavusReplicaId` (Face / replica, e.g. `r5e781e37a8d`). The BFF creates a Tavus conversation server-side (`TAVUS_API_KEY`) and the workspace embeds `conversationUrl` in an iframe (`camera; microphone; fullscreen; display-capture`). Optional `meetingToken` is appended as `?t=`.

See `specs/domain/tavus-video-chat.md` · `knowledge/tavus-video-chat.md`.

## Image attachments + A/B compare

Persona mode only (off on TG, guest embed, public share guest). Composer attach → compress → `POST /api/chat/images/upload` → pending `imageIds` on send. With exactly two pending images, optional **A/B compare** injects the structured winner instruction into the native stream. Spec: `specs/domain/chat-image-attachments.md`.

## Document attachments (DOCX)

Persona mode only. Composer DOCX pick → `POST /api/chat/documents/upload` → pending `documentIds`; extracted text merges into the user turn for the LLM. Spec: `specs/domain/chat-document-attachments.md`.

## Project knowledge RAG

Persona mode + `projectId`: durable chunks in Postgres (jsonb embeddings), OpenRouter preferred / OpenAI key fallback (`openai/text-embedding-3-small`). Session DOCX merge stays separate. Spec: `specs/domain/chat-knowledge-rag.md` · API `specs/api/knowledge-rag.md`.

## Non-goals (MVP)

- Moodboard drawer
- Whisper voice (mic UI)
- Public unauthenticated share (middleware `PUBLIC_PATHS`) — follow-on
- Full adaptive-prompt admin / Qdrant debug panels
- Journey-in-chat context picker (follow-on once journeys ship)
- Persisted TG round history / multi-turn TG sessions
- Voice / inspect / attachments in TG mode
- Guest-embed attachments
- Legacy `.doc` / S3 blob storage

## Acceptance

1. `/chat` renders composer + empty/loading/error with DS primitives + `.chat-panel-open`.
2. With `personaId`, topbar shows that persona; messages stream from chat-api or fixture fake-stream.
3. History route lists conversations and opens `/chat` with the right id/query.
4. Chat visual chrome comes from `@msqdx/ui` (`chat.css`); answer code reused from ECHON, not reinvented.
5. No hardcoded chat/API URLs — `paths.ts` + runtime config + `knowledge/paths.md`.
6. Unit/smoke: open classes + fixture stream smoke (`chat-panel.test.tsx`).
7. With `targetGroupId`, TG mode shows ask-all grid; send fans out ≤10 streams; cards fill with `ChatAnswer`.
8. TG detail exposes CTA to `/chat?targetGroupId=`.
9. TG mode smoke test: fan-out mocked streams → N cards.
10. Persona video toggle with `tavusReplicaId` embeds a Tavus CVI iframe (not a stub URL).
11. Persona chat can attach images, stream with vision, and A/B-compare exactly two images.
12. Persona chat can attach `.docx`; text merges into the user turn; attachments survive redeploy when Postgres is configured.