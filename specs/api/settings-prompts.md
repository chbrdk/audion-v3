# Settings prompts API

**Status:** Accepted — 2026-07-31  
**UI:** `/settings/admin/prompts`  
**Paths:** `paths.routes.apiSettingsPrompts*` · `knowledge/paths.md`

## Endpoints

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/settings/prompts` | List templates with metadata + override flag + resolved bodies |
| `GET` | `/api/settings/prompts/[templateId]` | Single resolved template |
| `PUT` | `/api/settings/prompts/[templateId]` | Upsert global override (`system`, `user`, `prompt`) |
| `DELETE` | `/api/settings/prompts/[templateId]` | Clear override → base catalog |
| `POST` | `/api/settings/prompts/test` | Render + run assist (native) or stub JSON |

## List item shape

```ts
{
  id: string
  label: string
  description: string
  category: string
  json: boolean
  overridden: boolean
  system: string
  user: string   // resolved user message (from `user` or `prompt`)
  prompt: string // raw prompt body if template uses V2 single-body form
}
```

## PUT body

```ts
{
  system?: string | null
  user?: string | null
  prompt?: string | null
}
```

Empty strings clear that field on the override. At least one of `system` / `user` / `prompt` required.

## Test body (existing + vars passthrough)

```ts
{
  templateId: string
  locale?: string
  context?: string
  persona_profile?: string
  max_items?: string
  vars?: Record<string, string>  // optional extra ${} vars
  /** Unsaved editor bodies — test without persisting override */
  system?: string
  prompt?: string
}
```

When `system` / `prompt` are provided, the test run uses them instead of the stored resolved template (V2 `testPrompt` parity).

## Related

Persona chat prompts: `specs/api/settings-persona-prompts.md` · workspace: `specs/domain/prompt-builder-workspace.md`

## Errors

| Status | When |
|--------|------|
| 400 | Unknown `templateId` / invalid PUT |
| 404 | GET/PUT/DELETE unknown id |
| 502 | Native assist provider failure |

## Acceptance

1. List returns ported labels and full bodies for editing.
2. PUT then GET shows `overridden: true` and merged text.
3. DELETE restores base; test uses resolved template (or unsaved `prompt`/`system` when sent).
4. Prompt Builder workspace can Save and Test from the same surface.
