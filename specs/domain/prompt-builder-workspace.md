# Prompt Builder workspace

**Status:** Accepted — 2026-07-31  
**Route:** `/settings/admin/prompts`  
**Knowledge:** `knowledge/prompt-builder-workspace-2026.md`  
**Reference:** AUDION-v2 PromptBuilder (3-column) + magazine DS chrome

## Purpose

Full-height editorial workspace to browse, edit, preview, test, and save Assist templates and Persona chat system prompts — V2 behavioral parity with DS visuals.

## Layout regions

| Region | Contents |
|--------|----------|
| Template rail (left) | Search; Assist list; Persona chat-prompt list |
| Toolbar | Meta chips · Save · Reset · Mock toggle · Test |
| Variable palette | Standard `${var}` chips — click + drag insert |
| Center | Tabs: Editor \| Live preview |
| Right | Context vars · Test output |

## Catalog bands

1. **Assist** — `ASSIST_TEMPLATES` + fixture overrides (existing APIs)
2. **Persona** — per-persona `systemPrompt` / optional `systemPromptDe` (new APIs)

## Interactions

- Click chip / drag onto editor inserts syntax at cursor
- Live preview uses `substituteVars` + mock or freeform context
- Test runs existing prompt-test API (assist) or dry-run preview for persona prompts
- Save persists from toolbar (assist override or persona prompt PUT)
- Reset restores base assist catalog / clears persona custom prompt

## Non-goals

Extended entity resolvers · create/delete assist ids · provider metadata editors · Postgres

## Acceptance

1. Workspace fills admin prompts page (not stacked one-panel form).
2. Assist + Persona bands selectable; Save/Reset/Test work.
3. Chip insert and live `${}` preview work with mock context.
4. Chat native stream prefers stored persona system prompt when set.
5. Tests cover workspace smoke + persona store + chat resolve.
