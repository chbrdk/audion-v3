# Chat video session API

**Status:** Accepted — 2026-09-23  
**Domain:** `specs/domain/video-call-providers.md` · `tavus-video-chat.md` · `bey-video-chat.md`  
**Contracts:** `ChatVideoSessionResponse` · `ChatTavusSessionResponse` (compat)  
**Paths:** `paths.routes.apiChatVideoSession` · `apiChatTavusSession`

## Endpoints

### `POST /api/chat/video/session`

Body: `{ "personaId": string }`

Resolves provider per `video-call-providers.md`, syncs PAL/agent, creates a session.

**201** — `ChatVideoSessionResponse`:

```ts
{
  stubbed: false
  provider: 'tavus' | 'bey'
  personaId: string
  conversationId: string | null
  media:
    | { kind: 'iframe'; url: string; token?: string | null }
    | { kind: 'livekit'; url: string; token: string }
}
```

**Errors:** 400 (`PERSONA_NOT_FOUND`, `VIDEO_PROVIDER_UNCONFIGURED`, `TAVUS_REPLICA_MISSING`, `BEY_AVATAR_MISSING`, `BEY_AGENT_MISSING`), 503 (missing API key), 429 (concurrency), 502 (upstream).

### `DELETE /api/chat/video/session`

Body: `{ "conversationId": string, "provider"?: "tavus" | "bey" }`

- `tavus` (default when provider omitted and id looks like Tavus / when only Tavus was used): end conversation via Tavus API.
- `bey`: acknowledge end; LiveKit disconnect is client-side.

**200** `{ ok: true, conversationId }`

### Compat — Tavus-only

| Method | Path | Role |
|--------|------|------|
| `POST` / `DELETE` | `/api/chat/tavus/session` | Unchanged Tavus behaviour; response remains `ChatTavusSessionResponse` (`conversationUrl`, `meetingToken`, …). |

Chat UI should prefer `/api/chat/video/session`. Tavus route stays for older clients/tests.

## Auth / embed

Same as chat stream: authenticated magazine chat and `embed=full`. Public guest embed must not call this route from UI.
