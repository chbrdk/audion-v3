# Chat stream continuity — no mid-answer reset (2026-09-24)

## Symptom
Persona web chat: assistant text starts streaming, then appears to **reset / blink**, then continues or shows the rest.

## Causes
1. On `done`, the client swapped the assistant turn `id` to the server `messageId` → React remounted `key={turn.id}` and replayed `.reveal` (opacity 0 → 1).
2. `syncUrl` called `router.replace` with the new `conversationId` → App Router soft-nav remounted `ChatPage` / wiped live state.
3. Soft post-filter (`humanizePersonaReply`) ran after streamed deltas; a remount then showed the filtered final text as a second paint.

## Fix
- Keep the local streaming turn `id` stable through `done`.
- URL sync via `history.replaceState` only (no `router.replace` for conversation query).
- `done.text` carries the final filtered string; client replaces bubble content in place.
- `ChatAnswer animate={false}` in the persona chat panel (no `.reveal` on live turns).

Spec: `specs/domain/chat-workspace.md` § Composition / acceptance #17.
