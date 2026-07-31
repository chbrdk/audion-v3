# Prompt templating (AiAssist)

**Status:** Accepted — 2026-07-31  
**Knowledge:** `knowledge/v2-prompt-templating-parity-2026-07-31.md`, `knowledge/settings-admin-2026.md`  
**Reference:** AUDION-v2 `apps/api/app/prompts/templates.yaml` + `AiAssistService`

## Purpose

Canonical assist prompt catalog for native OpenAI workflows (persona enrich, journey moments, research, etc.), with `${var}` substitution, locale guards, and editable global overrides (fixture-backed until product Postgres).

## Template model

| Field | Role |
|-------|------|
| `id` | Stable id (`persona.interests`, `journey.moments`, …) |
| `label` / `description` / `category` | Admin listing |
| `system` | Optional system message (thin role) |
| `user` **or** `prompt` | User message body; `prompt` is the V2 single-body form (preferred for ported YAML) |
| `json` | Prefer `response_format: json_object` |

Resolution order: **global override** (fixture store) → **base catalog**.

## Variable syntax

- Primary: `${name}` (V2 / Python `string.Template` safe_substitute semantics — missing vars → empty)
- Alias: `{{name}}` (legacy v3 one-liners)
- Locale aliases always normalized before render:
  - `output_locale` / `locale` → `en` | `de`
  - `generated_text_locale_name` → `English` | `German`
- After render, append **locale output guard footer** (V2 parity) to the user/`prompt` body

Extended entity resolvers (`${persona:${id}.…}`, knowledge graph) are **out of scope** for this wave.

## Context builders

Call sites pass thin string maps. Shared helpers fill persona/journey fields:

- `persona_profile`, `persona_name`, `persona_interests`, … from magazine persona
- `journey_name`, `phase_name`, `target_group_summary`, `max_items`, …
- Always inject locale aliases via `finalizeAssistVars`

## Admin surface

`/settings/admin/prompts` — full-height **Prompt Builder workspace** (see `specs/domain/prompt-builder-workspace.md`):

- Assist catalog + Persona chat prompts
- Variable palette (click/drag insert), live preview, Save in toolbar, Test

## Non-goals (this wave)

- Per-project overrides (Postgres)
- Extended entity resolvers in live preview
- Create/delete new assist template ids
- Avatar DB `{{ name }}` templates
- Prompt cache prefix/suffix split

## Acceptance

1. Shared persona/journey ids use ported V2 prompt copy (not one-liners).
2. `${var}` and `{{var}}` both substitute; locale footer present on native runs.
3. Overrides persist in-process (fixture store) and apply on `runAssist`.
4. Suggest-field + journey moments native paths pass rich context vars.
5. Prompt Builder workspace ships Assist + Persona bands with Save/Test.
6. Specs + tests + knowledge updated.
