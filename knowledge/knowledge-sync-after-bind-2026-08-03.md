# Knowledge sync after Collection bind (2026-08-03)

## Gap
`sync-plexon` bound identity only. Research / dossier stayed AUDION-local until manual `knowledge-pack/publish`. Late-bound Bosch had empty Collection `research_brief`.

## Fix
Autosync `research_brief` after:
- Collection bind / re-sync (`syncProjectToPlexon`)
- Project create origin bind
- Easy Setup bind
- “Add to project knowledge”
- Research success (existing)

## Bosch
Manual publish already ran: Collection `7efa3e75-…` revision 2, 8 sections.
UI: https://plexon-v3.projects-a.plygrnd.tech/projects/7efa3e75-f28f-4600-9f2e-6a7d1cdbd5d5

Spec: `specs/domain/knowledge-pack-publish.md`
