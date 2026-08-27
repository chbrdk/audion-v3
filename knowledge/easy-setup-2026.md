# Easy Setup — DROPPED

**Status:** Dropped 2026-08-27

The magazine bootstrap flow (`/setup`, `POST /api/projects/bootstrap`, Easy Setup CTAs) is removed from AUDION v3.

Create projects, target groups, and personas via the normal hub create dialogs instead.

## Was removed

| Surface | Former path |
|---------|-------------|
| UI | `/setup` · `EasySetupPanel` · home Cover CTA · projects index tile |
| API | `POST /api/projects/bootstrap` |
| Lib | `lib/easy-setup.ts` · `lib/easy-setup-url.ts` |
| Contracts | `packages/contracts/src/easy-setup.ts` |

Historical design notes lived here through 2026-07; do not reintroduce without a new accepted spec.
