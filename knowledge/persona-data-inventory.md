# Persona data inventory (v2 payload → v3 magazine)

Snapshot from live v2 admin UI vs AUDION v3 `PersonaDetail` (full profile parity in contract; magazine presentation).

Source of truth for v2 shape: `AUDION-v2/packages/types/src/index.ts` → `PersonaProfile` (+ moodboard API).
Source of truth for v3 shape: `packages/contracts/src/personas.ts` → `PersonaDetail`.
Normalizer: `apps/web/lib/personas.ts` (unwraps nested `profile` / `moodboard`).

## Field map

| v2 / UI | v3 field | Magazine band |
| --- | --- | --- |
| name, headline/role, age, location, gender | summary + scalars | hero facets |
| bio | `bio` | lede |
| traits | `traits` | meters |
| interests / values | `interests` / `values` | editable lists (same UX as Goals) |
| social_media_usage | `socialMediaUsage` | contract only (no separate magazine band; channels cover touchpoints) |
| communication_style | `communicationStyle` | Communication band |
| goals / pain_points | `goals` / `frustrations` (objects) | editable lists |
| channels (work) | `channels` | channel bubbles |
| moodboard tiles | `visuals` | visuals grid |
| color_palette, attention_span, media_affinity, confidence | matching fields | facets / reserved |

## Still deferred

- `knowledge[]` / `documents[]` CRUD (separate resources)
- bilingual `profile_de`
- moodboard generate/rebuild APIs
- inline editors for traits / interests / values / vocabulary
