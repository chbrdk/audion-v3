# Prompt Builder workspace — 2026-07-31

Full-height DS Prompt Builder at `/settings/admin/prompts` (V2 behavioral parity, magazine chrome).

## Specs

- `specs/domain/prompt-builder-workspace.md`
- `specs/api/settings-persona-prompts.md`
- `specs/domain/prompt-templating.md` · `specs/api/settings-prompts.md`

## Layout

- Left: Template rail (Assist + Persona chat)
- Center: Variable chips · system accordion · Editor | Live preview
- Right: Test context · execution output
- Toolbar: Save · Reset · Mock · Test

## Key paths

| Piece | Path |
|-------|------|
| Workspace | `apps/web/components/prompt-builder/PromptBuilderWorkspace.tsx` |
| Persona store | `apps/web/lib/fixtures/persona-prompts-store.ts` |
| APIs | `apiSettingsPrompts*` · `apiSettingsPersonaPrompts*` |
| Chat resolve | `resolvePersonaSystemPrompt` → adaptive profile + optional custom voice (`adaptive-persona-chat-prompt.ts`) |

Persona band edits **custom voice overlay** only; live preview shows `resolvedSystemPrompt` (magazine traits/style always included). See `knowledge/adaptive-persona-chat-2026-08-27.md`.

## Smoke

```bash
cd apps/web
npx vitest run __tests__/prompt-builder.test.tsx __tests__/adaptive-persona-chat-prompt.test.ts __tests__/settings-admin.test.tsx
```
