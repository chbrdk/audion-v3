# Project migration map (AUDION-v2 → v3)

**Date:** 2026-07-30

| v2 | v3 |
|----|-----|
| `/admin/projects` | `/projects` |
| `/admin/projects/[id]` | `/projects/[projectId]` |
| `/admin/projects/[id]/prompts` | Deferred |
| Glass overview / admin panel | Magazine list + detail |
| Research / federation / suggest AI | Deferred |
| Members | Fixture members on detail |
| Audience links / counts | Two-column TG + Persona card grids with create |
| `ProjectSummary` / detail | `packages/contracts/src/projects.ts` |

## Detail layout notes (2026-07-30)

- Hero is **text-only** (`.audion-magazine-hero--text`) — full width like we wanted; no avatar/portrait.
- Intro: `.audion-project-intro` — description (~2/3) + larger Team right (`~1/3`, max 32rem).
- Audience: `.audion-project-split` — Target groups | Personas at **50 / 50**.
- Project knowledge dossier below audience — `@msqdx/ui` **Accordion** + TipTap; see `knowledge/project-knowledge-ux.md` · DS `msqdx-ui-accordion.md`.
- Create from project prefills `projectId` via `PersonaCreateButton` / `TargetGroupCreateButton`.
- Components: `project-compact-lists.tsx`, `project-knowledge-dossier.tsx`, `knowledge-rich-editor.tsx`

Specs: `specs/domain/project-workspace.md` · `project-fields.md` · `specs/api/projects.md`
