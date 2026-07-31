# V2 prompt templating → V3 parity (2026-07-31)

## Specs

- Domain: `specs/domain/prompt-templating.md`
- API: `specs/api/settings-prompts.md`

## V2 architecture (source of truth)

| Layer | Path / store | Role |
|-------|----------------|------|
| Base YAML | `AUDION-v2/apps/api/app/prompts/templates.yaml` | 18 AiAssist templates |
| Registry + render | `…/services/ai_assist.py` | `${var}` + locale footer + project overrides |
| Admin UI | `/admin/settings/prompts` + PromptBuilder | Edit / palette / live test |

## V3 shipped (this wave)

| Piece | Path |
|-------|------|
| Ported bodies | `apps/web/lib/ai/prompts/v2-ported.ts` (all 18 YAML ids) |
| Shared SYSTEM | `apps/web/lib/ai/prompts/system.ts` → `AUDION_ASSIST_SYSTEM` (imported by templates + v2-ported) |
| Catalog merge | `apps/web/lib/ai/prompts/templates.ts` (+ V3-only: moodboard, research, validate_chat, `persona.chat_system_default`, …) |
| Renderer | `apps/web/lib/ai/prompts/render.ts` — `${}` + `{{}}`, locale aliases, footer |
| Context builders | `apps/web/lib/ai/prompts/context.ts` |
| Overrides | `apps/web/lib/fixtures/prompt-overrides-store.ts` (+ Postgres `assist_prompt_overrides` when `DATABASE_URL`) |
| Persona chat default | Template `persona.chat_system_default` — prompt body is the system prompt; `generateDefaultPersonaSystemPrompt` uses base catalog + `substituteVars` (no hardcoded multi-line array) |
| Admin | `/settings/admin/prompts` — list / edit / save / reset / test |
| APIs | `GET/PUT/DELETE /api/settings/prompts[/{id}]` · `POST …/test` |

## Shared SYSTEM + persona.chat_system_default

`AUDION_ASSIST_SYSTEM` is the single assist preamble. Default persona chat system prompts are not LLM-rendered: the catalog entry `persona.chat_system_default` holds the prompt body with `${name}`, `${role}`, `${bio}`, `${archetype}`, `${interests}`, `${values}`; `generateDefaultPersonaSystemPrompt` substitutes from the base `ASSIST_TEMPLATES` catalog (overrides do not affect the default generator).

## Still deferred

- Per-project overrides (Postgres)
- Extended `${persona:${id}.…}` / knowledge resolvers in live preview
- Full PromptBuilder chrome → **shipped** `knowledge/prompt-builder-workspace-2026.md`
- Chat `persona_prompts` builder → **shipped** (facade + Postgres `persona_chat_prompts` + rail band)
- Avatar DB `{{ name }}` templates
- Prompt cache prefix/suffix split

## Smoke

```bash
cd apps/web
npx vitest run __tests__/prompt-templating.test.ts __tests__/settings-admin.test.ts __tests__/settings-admin.test.tsx
```
