# Chat Fields / Contracts

**Status:** Accepted — 2026-07-29 · Implemented MVP 2026-07-29 · Think-aloud 2026-08-01  
**Contracts:** `ChatMessage` · `ChatConversationSummary` · `ChatSendPayload` · stream events · `ChatUxJourneyStep`  
**Think-aloud:** `specs/domain/ux-journey-think-aloud.md`  
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

## UX journey step (`ChatUxJourneyStep`)

| Field | Notes |
|-------|--------|
| `step`, `action`, `target`, `result` | action outcome |
| `reasoning` | cleaned VO text (blocks stripped) |
| `reasoningMeta` | browser-use bookkeeping only (`evaluation_previous_goal`, `memory`, `next_goal`) |
| `thinkAloud` | **product SoT** — see `ux-journey-think-aloud.md` |
| `observations[]` | research flags (expanded step UI) |
| `screenshot` / `screenshotUrl` | step frame |
| `timestamp` | ISO |

## Inspect snapshot (`ChatConversationInspect`)

| Field | Notes |
|-------|--------|
| `jobId`, `summary`, `videoUrl`, `steps`, `stepsTotal`, `convert`, `completedAt` | restore dock |
| `personaPolicy` | soft dims + heuristics |
| `scorecard` | journey aggregate (`frictionScore`, `personaFitScore`, strengths/weaknesses, …) |

`ChatToolCompleteEvent` mirrors `steps`, `personaPolicy`, `scorecard`.

## Stream events (normalize)

Client should accept a small event union (names may alias snake_case from chat-api):

| Event | Notes |
|-------|--------|
| `delta` | `{ text }` append to assistant turn |
| `done` | finalize turn; may include `conversationId` |
| `error` | `{ message }` → Alert |

Exact wire format follows chat-api; adapter lives in `apps/web/lib/chat/`.

## Validation

- Empty `message` → Field error on composer; do not POST
- Missing `personaId` → block send; prompt persona picker
- Unknown roles on history load → drop or coerce to `assistant`

## Target-group ask-all (client shapes)

Not persisted conversations — UI round state only.

| Type | Notes |
|------|--------|
| `ChatMode` | `persona` \| `target_group` |
| `ChatTargetGroupRoundSlot` | `personaId`, `personaName`, `role`, `content`, `status` (`pending` \| `streaming` \| `complete` \| `error`), optional `error` |
| `ChatTargetGroupRound` | `id`, `question`, `createdAt`, `slots: ChatTargetGroupRoundSlot[]` |
| Cap | `MAX_TG_CHAT_PERSONAS = 10` (constant in app `lib/chat/tg-ask-all.ts`) |

Send still uses per-persona `ChatSendPayload` (required `personaId`) via fan-out.

## Tavus session (`ChatTavusSessionResponse`)

`POST /api/chat/tavus/session` `{ personaId }` →

| Field | Notes |
|-------|--------|
| `stubbed` | always `false` on success (no fake conversation URL) |
| `conversationUrl` | Tavus CVI embed URL |
| `meetingToken` | nullable; append `?t=` when present |
| `conversationId` | nullable Tavus conversation id |
| `personaId` | Audion persona id |

Missing replica → 400. Missing `TAVUS_API_KEY` → 503.

## Deferred

- Attachment / document ids on send
- Moodboard asset refs
- Share-token conversation persistence
- Voice session ids
- Persisted TG round history / multi-turn TG sessions
