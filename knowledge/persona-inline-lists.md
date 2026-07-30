# Persona inline list editing

Goals and Frustrations edit **on the magazine**, not in the topbar Edit dialog. Channels use a separate bubble + icon-picker UX (`knowledge/persona-channel-icons.md`).

## Behavior (Goals / Frustrations)

- Click row text → inline input; Enter or blur saves; Esc cancels
- Section chrome “+” appends a draft row and focuses it
- Delete icon → confirm `Dialog` → PATCH remaining array

## Persist

`PATCH paths.routes.apiPersonaDetail(id)` with `{ goals | frustrations: string[] }`  
Fixture: `storePatchPersona` partial arrays (`!== undefined` replace)

## Files

| Piece | Path |
|-------|------|
| Component | `apps/web/components/persona-editable-list.tsx` |
| Channels | `apps/web/components/persona-channel-bubbles.tsx` |
| Wire-up | `apps/web/components/persona-detail-panel.tsx` |
| Profile dialog | `apps/web/components/persona-edit-dialog.tsx` (lists removed) |
| Styles | `.audion-editable-list*` in `apps/web/app/globals.css` |
| Spec | `specs/domain/persona-workspace.md`, `specs/domain/edit-dialogs.md` |

## Out of scope

Notes/sections inline, hero facets/bio inline, drag-reorder.
