# Persona + TG edit wave

- Index composition: **Personas + Target groups** share `audion-tg-card` / `audion-tg-grid` (large name, airy top, small meta).
- Linked personas on TG detail use the same app-card grid (`audion-tg-grid--nested`).
- Magazine detail: entity edit/delete is an **icon cluster bottom-right inside the hero** (`.audion-magazine-hero-actions` + `.audion-edit-icon-btn`); workflow CTAs stay in the topbar when present.
- Persona Goals / Frustrations / Channels: **inline** on the magazine (`persona-editable-list.tsx`); dialog is profile-only.
- Input chrome lives in **`@msqdx/ui`** (`field.css`) — AUDION no longer overrides borders/labels.
- Fixture writes: in-memory stores + Next `/api/personas` and `/api/target-groups`.
- Linked personas on TG detail navigate via `paths.routes.personaDetail(id)`.

## Specs

| Area | Spec |
|------|------|
| Persona workspace | `specs/domain/persona-workspace.md` |
| TG workspace | `specs/domain/target-group-workspace.md` |
| Edit dialogs | `specs/domain/edit-dialogs.md` |
| Persona fields | `specs/domain/persona-fields.md` |
| TG fields | `specs/domain/target-group-fields.md` |
| Personas API | `specs/api/personas.md` |
| TG API | `specs/api/target-groups.md` |
| Index | `knowledge/specs-index.md` |

## DS

| Area | Spec / notes |
|------|----------------|
| Forms wave | `msqdx-ui/specs/domain/msqdx-ui-forms.md` |
| Field chrome | `msqdx-ui/specs/domain/msqdx-ui-field.md` |
| ConfirmDialog | `msqdx-ui/specs/domain/msqdx-ui-extended.md` |
| Field knowledge | `msqdx-ui/knowledge/msqdx-ui-field.md` |
| Forms knowledge | `msqdx-ui/knowledge/forms-edit-wave.md` |
