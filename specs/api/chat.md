# Chat API Consumption

**Status:** Accepted — 2026-07-29 · Implemented fixture stream 2026-07-29  
**Contracts:** `@audion-v3/contracts` chat  
**Config:** runtime config + `paths.ts`  
**Legacy:** AUDION-v2 `apps/chat-api` · Next proxies under `/api/chat/*` · `knowledge/chat-share-paths.md`

## Source backend

AUDION v3 does not reimplement the chat service. It consumes chat-api (and optional share persona endpoints) via central URLs.

## Env / config (central)

| Key | Role |
|-----|------|
| Chat API base (internal) | e.g. `NEXT_CHAT_API_INTERNAL_URL` — document in `paths` / runtime-config |
| Optional public | only if browser must call chat-api directly (prefer Next proxy) |
| Data/fixture mode | reuse fixture flag for UI-only fake stream |

Never hardcode hostnames in components.

## Endpoints (upstream chat-api — illustrative)

Wire names follow existing v2 proxies; confirm against live OpenAPI when implementing:

- `POST /chat/message` or stream variant — send user turn
- `POST /chat/message/stream` (SSE or chunked) — assistant deltas
- `GET /chat/conversations` · `GET /chat/conversations/{id}` — history
- Health: `GET /health` (ops)

### Share / persona (deferred public)

- `GET /personas/{id}/public?project_id=` via share proxy when public `/chat` returns

## Local Next (MVP)

| Method | Path | Role |
|--------|------|------|
| `POST` | `/api/chat/stream` (`paths.routes.apiChatStream`) | Native OpenAI NDJSON stream (or fixture fake-stream) |
| `POST` | `/api/chat/images/upload` (`paths.routes.apiChatImagesUpload`) | Durable image store → `{ imageId }` (auth; not guest) |
| `POST` | `/api/chat/documents/upload` (`paths.routes.apiChatDocumentsUpload`) | DOCX extract + durable store → `{ documentId, filename, charCount, truncated }` |
| `GET` | `/api/chat/conversations` | List (fixture or proxy) |
| `GET` | `/api/chat/conversations/[id]` | Detail |
| `POST` | `/api/chat/tavus/session` (`paths.routes.apiChatTavusSession`) | Create Tavus CVI session from persona `tavusReplicaId` (ends leftover active rooms first) |
| `DELETE` | `/api/chat/tavus/session` | End a Tavus conversation `{ conversationId }` |

Stream body may include `imageIds`, `documentIds`, `abCompare` — see `specs/domain/chat-image-attachments.md` · `specs/domain/chat-document-attachments.md`.

Project knowledge RAG (planned): internal retrieve on stream when `projectId` set — `specs/domain/chat-knowledge-rag.md` · `specs/api/knowledge-rag.md`.

## Runtime rules

- Prefer server/proxy for secrets and long timeouts (see v2 `chat-proxy-timeout` notes)
- Client uses `paths.routes.chat` + query `personaId` / `projectId` / `conversationId`
- Fixture mode: deterministic transcript + incremental fake deltas for tests
- Errors surface as `Alert`; toasts optional for non-stream failures (`Toast` from DS)
- Native stream builds an **adaptive persona system prompt** every turn (`adaptive-persona-chat-prompt.ts`); optional custom voice overlays it. Completions use `max_tokens` from `paths.chatCompletionMaxTokens` (override `AI_CHAT_MAX_TOKENS`).

## Adaptive prompt

See `specs/domain/chat-workspace.md` § Persona system prompt · knowledge `knowledge/adaptive-persona-chat-2026-08-27.md`.
