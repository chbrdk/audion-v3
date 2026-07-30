# Journey phase slider (v3)

**Date:** 2026-07-29  
**Components:**  
- `apps/web/components/journey-phase-slider.tsx`  
- `apps/web/components/journey-phase-edit-dialog.tsx`  
**Styles:** `.audion-journey-timeline*` / `.audion-journey-slide*` in `apps/web/app/globals.css`  
**Spec:** `specs/domain/journey-workspace.md`

## Pattern (from AUDION-v2)

v2 editor used a horizontal snap viewport + step pills + prev/next + trailing add-phase card.

v3 keeps that interaction in magazine language:

| Piece | Implementation |
|-------|----------------|
| Step chips | `role="tablist"` pills → scroll-to-index |
| `+ Phase` chip | scrolls to create slide + opens create dialog |
| Prev / Next | ghost buttons + `n / total` (or `New` on create slide) |
| Viewport | `width/max-width: 100%` + `min-width: 0` + `overflow-x: auto` (page must not grow) |
| Phase cards | `flex: 0 0 28rem` — never use `vw` flex-basis (blows page width) |
| Create card | dashed trailing slide → create dialog |
| Journey topbar | Edit + Delete (confirm) |
| Persist | PATCH journey with full `phases[]`; DELETE journey |

## Reuse

Prefer this slider whenever journey phases are shown. Phase CRUD overlays via dialog without replacing the timeline chrome.
