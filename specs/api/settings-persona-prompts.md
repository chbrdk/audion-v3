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
  systemPrompt: string
  systemPromptDe?: string | null
  templateVersion: string
}
```

## Errors

| Status | When |
|--------|------|
| 404 | Unknown personaId |
| 400 | Empty `systemPrompt` on PUT |

## Acceptance

1. PUT then GET returns custom body; `hasCustom: true`.
2. DELETE restores generated default; chat stream uses override when set.
