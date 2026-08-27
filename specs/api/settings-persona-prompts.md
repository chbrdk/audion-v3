# Settings persona prompts API

**Status:** Accepted — 2026-07-31  
**UI:** `/settings/admin/prompts` (Persona band)  
**Paths:** `paths.routes.apiSettingsPersonaPrompts*`

## Endpoints

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/settings/persona-prompts` | List personas with prompt summary |
| `GET` | `/api/settings/persona-prompts/[personaId]` | Resolved prompt body |
| `PUT` | `/api/settings/persona-prompts/[personaId]` | Upsert custom system prompt |
| `DELETE` | `/api/settings/persona-prompts/[personaId]` | Clear custom → generated default |

## List item

```ts
{ personaId: string; name: string; hasCustom: boolean; updatedAt: string | null }
```

## Detail / PUT body

```ts
{
  /** Editable custom voice overlay (empty when using adaptive default only). */
  systemPrompt: string
  /** Full prompt the chat model receives (adaptive + optional voice). */
  resolvedSystemPrompt: string
  /** Adaptive profile without custom voice (for UI preview). */
  adaptiveProfilePrompt: string
  systemPromptDe?: string | null
  templateVersion: string
  hasCustom: boolean
  updatedAt: string | null
}
```

PUT `systemPrompt` upserts the **custom voice overlay** only (required non-empty). Adaptive magazine profile is always injected at resolve time.

## Errors

| Status | When |
|--------|------|
| 404 | Unknown personaId |
| 400 | Empty `systemPrompt` on PUT |

## Acceptance

1. PUT then GET returns custom voice in `systemPrompt`; `hasCustom: true`; `resolvedSystemPrompt` still contains adaptive traits/style.
2. DELETE restores adaptive-only default; chat stream uses overlay when set.
3. GET without custom: `systemPrompt` empty or unused for edit; `resolvedSystemPrompt` === adaptive profile.