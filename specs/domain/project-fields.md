# Project fields

**Status:** Accepted — 2026-07-30  
**Contract:** `packages/contracts/src/projects.ts`  
**Workspace:** `specs/domain/project-workspace.md`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Stable id |
| `name` | string | Required |
| `nameDe` | string \| null | Optional DE label |
| `description` | string \| null | Short dek |
| `companyContext` | string \| null | Flattened knowledge preview / search (derived from chapters) |
| `knowledgeChapters` | ProjectKnowledgeChapter[] | Detail only — accordion chapters `{ id, title, body }` where `body` is sanitized HTML (WYSIWYG) |
| `status` | `draft` \| `published` \| `archived` | |
| `personaCount` | number | Derived / denormalized |
| `targetGroupCount` | number | Derived / denormalized |
| `memberCount` | number | From members |
| `updatedAt` | string \| null | ISO |
| `members` | ProjectMember[] | Detail only |
| `platformProjectId` | string \| null | Optional — Plexon platform project (Wave 1) |
| `platformCompanyId` | string \| null | Optional — Plexon company |
| `ownerPlexonUserId` | string \| null | Optional — Plexon owner |

## Write payload

`name` required; optional `nameDe`, `description`, `companyContext` (create → initial Brief chapter), `knowledgeChapters` (full replacement), `status`, `members` (full replacement when provided), `platformProjectId`, `platformCompanyId`, `ownerPlexonUserId`.
