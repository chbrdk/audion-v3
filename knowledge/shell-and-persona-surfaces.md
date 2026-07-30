# AUDION v3 shell continuation notes

## Shell composition (ECHON-aligned)

- Floating left `NavRail` with MSQ logo + Home/Personas
- Footer settings avatar (placeholder, disabled)
- Top-right `BrandCorner` with cutouts + AUDION label
- Topbar: `PageTitle` left, optional `TopStatus`/actions right

## Persona surfaces

- **Index `/personas`**: magazine grid of portraits (no side list / empty detail). Search + auto-fill cards with Avatar portrait, name, role, status.
- **Detail `/personas/[id]`**: full-width magazine article only (no left persona list):
  - Shell `PageTitle` shows the linked **target group** (quiet `titleTone="context"`), linked to TG detail — not the persona name
  - No page-lead description / no briefing-nav crumbs (status & archetype live in hero facets)
  - Magazine topbar: edit actions only (right)
  - hero grid: portrait (`Avatar` oversized) + title / deck / `labeled-facets`
  - `signal-pullquote` from bio
  - body grid (`audion-magazine-bands`): Goals · Frustrations · Channels · Notes with magazine OL drop numerals
- Avatars: `avatarUrl` on contracts; demo SVGs under `public` via `personaAvatarPath()` in `lib/paths.ts`
- No KPI/pipeline/overview stack

## Paths

See `knowledge/paths.md` and `apps/web/lib/paths.ts`.
See also `knowledge/persona-magazine.md`.
