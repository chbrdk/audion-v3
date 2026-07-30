# Project context / knowledge — design direction

**Date:** 2026-07-30  
**Status:** Accordion chapters + TipTap WYSIWYG; Accordion promoted to `@msqdx/ui`

## Problem

Project context is the **input knowledge** from which target groups and personas are derived. It grows large — a single freeform wall cannot be scanned. TG / Personas stay compact lists; knowledge must stay a **dossier**, but chaptered and collapsible.

## Contrast

| | Audience (TG / Personas) | Project knowledge |
|--|--------------------------|-------------------|
| Role | Managed entities | Source briefing |
| Shape | Short rows, name + meta | Accordion chapters |
| Density | List inventory | One chapter open at a time |
| Metaphor | Roster | Dossier / notebook |

## Direction: **Knowledge accordion**

Full-width band under audience:

1. **Quiet masthead** — `SectionChrome` “Project knowledge” + count with `metaTone="accent"`.
2. **DS Accordion** — `@msqdx/ui` `Accordion` (`.ds-accordion*`), brand chevron `--accent`. Collapsed = title + preview; expanded = TipTap WYSIWYG.
3. **Add / remove chapter** — footer “Add chapter”; remove inside open panel.
4. **Legacy fallback** — empty `knowledgeChapters` + `companyContext` → single Brief chapter.

Not a glass / MUI admin accordion — see `msqdx-ui/specs/domain/msqdx-ui-accordion.md`.

## Implemented (2026-07-30)

- Contract: `ProjectKnowledgeChapter` + `ProjectDetail.knowledgeChapters` (`body` = sanitized HTML)
- Helpers: `apps/web/lib/project-knowledge.ts` (strip / sanitize / preview)
- UI: `project-knowledge-dossier.tsx` + `knowledge-rich-editor.tsx` (TipTap 3.29.2)
- DS: `Accordion` · `SectionChrome.metaTone` in `@msqdx/ui` (AUDION re-exports via `apps/web/lib/msqdx-ui.ts` — add new DS exports there for Next/Vitest)
- PATCH full `knowledgeChapters`; `companyContext` kept as plain-text join for search

## Spec touchpoints

`specs/domain/project-workspace.md` · `project-fields.md` · `knowledge/project-migration-map.md`  
DS: `msqdx-ui/specs/domain/msqdx-ui-accordion.md` · `msqdx-ui-section-chrome.md`
