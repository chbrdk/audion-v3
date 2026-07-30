# Chat Fields / Contracts

**Status:** Accepted — 2026-07-29 · Implemented MVP 2026-07-29  
**Contracts:** `ChatMessage` · `ChatConversationSummary` · `ChatSendPayload` · stream events  
**Migration:** `knowledge/chat-migration-map.md`  
**Legacy:** AUDION-v2 chat-api + Next `/api/chat/*`

## Conversation summary

| Field | Notes |
|-------|--------|
| `id` | required |
| `personaId` | required |
| `personaName` | nullable display |
| `projectId` | nullable |
| `title` | nullable (first user line or explicit) |
| `updatedAt` | nullable |
| `preview` | nullable last message snippet |

## Message

| Field | Notes |
|-------|--------|
| `id` | required |
| `role` | `user` \| `assistant` \| `system` |
| `content` | markdown string |
| `createdAt` | nullable ISO |
| `status` | `complete` \| `streaming` \| `error` (client) |

## Send payload (`ChatSendPayload`)

| Field | Notes |
|-------|--------|
| `personaId` | **required** |
| `message` | **required** non-empty trim |
| `conversationId` | optional (create if absent) |
| `projectId` | optional nullable |
| `journeyId` | optional — deferred context |

## Stream events (normalize)

Client should accept a small event union (names may alias snake_case from chat-api):

| Event | Notes |
|-------|--------|
| `delta` | `{ text }` append to assistant turn |
| `done` | finalize turn; may include `conversationId` |
| `error` | `{ message }` → Alert |

Exact wire format follows chat-api; adapter lives in `apps/web/lib/chat/` (to add).

## Validation

- Empty `message` → Field error on composer; do not POST
- Missing `personaId` → block send; prompt persona picker
- Unknown roles on history load → drop or coerce to `assistant`

## Deferred

- Attachment / document ids on send
- Moodboard asset refs
- Share-token conversation persistence
- Voice / Tavus session ids
