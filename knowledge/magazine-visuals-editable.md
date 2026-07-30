# Persona magazine Visuals (editable)

Visuals band on persona detail is always present and editable — same PATCH pattern as Notes / Communication.

## Behavior

- Style keywords: click chip to edit (Enter/blur save, Esc cancel, empty removes); **+ Keyword**
- Tiles: click → overlay editor (category, caption, image URL); Save / Cancel / Remove
- **Add tile** appends a fixture placeholder (`personaVisualPath('tone-warm')`) then opens editor
- Empty board: empty-state CTA; clearing all keywords + tiles persists `visuals: null`

## Files

| Role | Path |
|------|------|
| UI | `apps/web/components/persona-editable-visuals.tsx` |
| Helpers | `apps/web/lib/persona-visuals.ts` |
| Fixture SVGs | `apps/web/public/fixtures/personas/visuals/` via `paths.personaVisualBasePath` |
| Contract | `PersonaVisuals` / `PersonaWritePayload.visuals` |

## Persist

`PATCH /api/personas/:id` with `{ visuals }` (`toPersonaWriteVisuals`).
