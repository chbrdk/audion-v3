# AUDION v3 — Edit dialogs (Persona · Target Group · Journey)

**Status:** Accepted — 2026-07-29 · Amended 2026-08-29 (TG project picker)  
**Implements:** `persona-edit-dialog.tsx`, `target-group-edit-dialog.tsx` · `journey-edit-dialog.tsx` (planned)  
**DS:** `@msqdx/ui` Field / Input / Textarea / Select / TagInput / Dialog · `specs/domain/msqdx-ui-field.md` · `msqdx-ui-forms.md`  
**App CSS:** `.audion-edit-dialog`, `.audion-edit-form` (layout / hero only — **not** input chrome)

## Purpose

One airy modal language for create/edit profile fields. Persona **Goals / Frustrations / Channels** edit inline on the magazine (`PersonaEditableList`), not in this dialog. Chat uses composer chrome instead (not this dialog).

## Shell

| Piece | Rule |
|-------|------|
| `Dialog` | Native modal; class `audion-edit-dialog` |
| Width | ~`min(42rem, 100vw - 2.5rem)` |
| Title | Display face; create titles mirror create-tile copy (“New …”) |
| Actions | Cancel (ghost) + Save/Create (`size="md"`) |
| Body | Optional lede + stacked fields with generous gap |

## Form kit (always DS)

- `Field` `size="md"` + `error` / `hint` as needed
- `Input` / `Textarea` / `Select` / `TagInput` — chrome from **`@msqdx/ui` `field.css`**
- Name / primary identity field may use `.audion-edit-field--hero` (display type only)
- Segment/status (or role/status) may sit in `.audion-edit-row` (2-col → 1-col narrow)
- **Persona dialog:** profile fields only — no Goals / Frustrations / Channels `TagInput`s

## Validation

- Primary name required (inline `Field` error + `aria-invalid`)
- **Target group / persona create (and persona template):** project (`projectId`) required — picker options from `GET /api/ai/options`
- Arrays normalize empty; optional strings may be `null` on write

## Persistence

- Fixture mode: Next `POST`/`PATCH` under `paths.routes.api*` → in-memory stores
- Live API: same payload shapes in `packages/contracts` when backend is reachable

## Journey create/edit (planned)

- Same shell; fields per `specs/domain/journey-fields.md` (name hero, type, status, description, target group)
- Phase structure may follow in a later dialog step — see `journey-workspace.md`

## Non-goals

- Drawer/Sheet side-edit
- Avatar upload
- Full admin field sets from AUDION-v2
- Chat message editing (chat workspace owns turns)

## Acceptance

1. Opening create from index tile uses this dialog language.
2. Inputs match DS face (accent labels, light frame + firm bottom rule) without app-local border overrides.
3. Successful save navigates to the new/updated magazine detail and refreshes.
4. Unit coverage for create tiles + store mutations.
