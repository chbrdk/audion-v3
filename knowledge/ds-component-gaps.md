# AUDION v3 — DS component gaps (after magazine + edit wave)

**Date:** 2026-07-29  
**Index:** `knowledge/specs-index.md` · DS forms: `msqdx-ui/knowledge/forms-edit-wave.md`

## Already in product

Shell: `AppFrame`, `NavRail`, `BrandCorner`, `PageTitle`, `MsqdxLogoMark`  
Surfaces: `Avatar`, `Alert`, `TopStatus`, `Button`, `Text`, `Panel`, `EmptyState`, `LoadingText`, `SectionChrome`  
Forms: `Field`, `Input`, `Textarea`, `Select`, `TagInput`, `Dialog`

## Adopt next (already in `@msqdx/ui`, unused)

| Priority | Component | Why |
|----------|-----------|-----|
| P0 | `Toast` + `ToastProvider` | Save/create/error feedback |
| P0 | `ConfirmDialog` | Prefer for archive/delete; journey currently uses `Dialog` confirm (async-safe) |
| P0 | `Skeleton` / `Spinner` | API/`auto` loading chrome (`LoadingText` wired in chat via `lib/msqdx-ui.ts`) |
| P1 | `StatusDot` / `Chip` | Replace ad-hoc `data-status` CSS |
| P1 | `Tooltip` | Channel bubbles (today `title` only) |
| P1 | DS `IconOverview` / `IconPersonas` / … | Drop local `nav-icons.tsx` |

## Build in DS (not shipped)

| Priority | Need | Notes |
|----------|------|--------|
| P1 | Avatar / file upload (`FileField`) | Deferred in `edit-dialogs.md` · `persona-fields.md` |
| P2 | Persona typeahead / multi-select | Better than raw TagInput ids on TG |
| P3 | Breadcrumb | Optional; briefing-nav works |
| — | Drawer/Sheet | Explicit non-goal both sides |

## Product composition (not new DS atoms)

- Notes / sections editor in edit dialog
- TG sources · knowledge upload · generate-personas (later product slice; can use `DataTable` + Toast)
- Magazine grids / TG cards / article layout — **keep AUDION-local**

## Out of scope for magazine

`DataTable`, `FilterRow`, `Tabs`, `KpiStrip`, `PipelinePanel`, `StatusMeterPanel` — available, wrong surface until admin/sources wave.
