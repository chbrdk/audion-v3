# Collection team (AUDION) — Plexon SSOT

**Status:** 2026-09-19  
**Companion:** `plexon-v3/specs/api/collection-members.md` · `collection-invites.md`

## Rule

Access Model B membership for a federated project lives in Plexon (`user_platform_project_assignments` + Collection creator). Local `projects.members` JSON is **not** the ACL; it remains a migration source / offline fallback and is **never deleted** by sync.

## Product flows

| Action | Path |
|--------|------|
| List team | `GET /api/projects/:id/members` → Plexon `GET …/collections/:ppid/members` + merge residual local |
| Add by email | `POST /api/projects/:id/members` → Plexon POST members (additive) |
| Invite link | `POST /api/projects/:id/invites` → Plexon invites (`toEmail` when draft email is set) |
| Migrate local | `POST /api/projects/:id/sync-collection-members` — additive only (`migrated` / `already_member` / `user_not_found`) |
| Revoke | `DELETE /api/projects/:id/members/:userId` |

## Guardrails

- No overwrite of existing Plexon roles on migrate or re-add.
- Creator immutable on Plexon.
- Unbound / `plx-local-*` projects stay on local members UI only.

## Mail

Outbound team/auth mail is **Plexon-only** — do not add `SMTP_*` here. Team Invite forwards draft email as `toEmail`; Plexon sends `collection_invite`. Member add triggers `collection_member_added` on `status: added`. Spec: `plexon-v3/specs/domain/transactional-email.md` · `plexon-v3/knowledge/transactional-email.md`.
