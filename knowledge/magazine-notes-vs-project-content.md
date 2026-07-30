# Magazine Notes vs project knowledge content

**Date:** 2026-07-30  
**Scope:** audion-v3 magazine UI (not AUDION-v2 glass admin)

## Status

Persona **Notes** (Mindset / Context / …) reuse the **project knowledge content card** pattern:

- Accordion chapters + TipTap `KnowledgeRichEditor`
- Same band classes: `.audion-magazine-band.audion-project-knowledge`
- Component: `PersonaEditableNotes` (`apps/web/components/persona-editable-notes.tsx`)
- Helpers: `apps/web/lib/persona-notes.ts` (HTML sanitize/preview via `project-knowledge.ts`)
- PATCH: `PersonaWritePayload.sections`

## Shell classes

| Class | Role |
|-------|------|
| `.audion-magazine.briefing-detail` | Article shell (persona / project / TG detail) |
| `.audion-magazine-band` | Body section wrapper (`Panel` / `stage-panel`) |
| `.audion-project-knowledge` / `.audion-persona-notes` | Editable content cards band |
| `.audion-magazine-note` | Legacy read-only note (replaced for persona Notes) |
| `.briefing-detail` | DS base from `@msqdx/ui` `briefing.css` |

## Project content pattern (source of truth)

- **Component:** `ProjectKnowledgeDossier` + `KnowledgeRichEditor`
- **Band:** `Panel.audion-magazine-band.audion-project-knowledge`
- **UX:** `SectionChrome` + `@msqdx/ui` `Accordion` + TipTap HTML body
- **Helpers:** `apps/web/lib/project-knowledge.ts`
- **Docs:** `knowledge/project-knowledge-ux.md`

## Paths

| Piece | Path |
|-------|------|
| Project knowledge | `apps/web/components/project-knowledge-dossier.tsx` |
| Persona Notes | `apps/web/components/persona-editable-notes.tsx` |
| TipTap editor | `apps/web/components/knowledge-rich-editor.tsx` |
| Persona detail host | `apps/web/components/persona-detail-panel.tsx` |
| Contract | `packages/contracts/src/personas.ts` (`PersonaSection.id?`, write `sections`) |
