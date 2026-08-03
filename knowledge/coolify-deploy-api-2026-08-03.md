# Coolify deploy via API (MCP is read-only)

**Date:** 2026-08-03  
**MCP `user-coolify`:** list/get only — no deploy/restart tools.  
**Write path:** Coolify REST `POST /api/v1/deploy?uuid=<appUuid>` with team Bearer token (same as MCP header in Cursor config).

## Audion v3 agent

| | |
|--|--|
| App | `audion-v3-ux-journey-agent` |
| UUID | `lfv0921nlqzl0qow9xse4it4` |
| Example | `POST https://coolify.plygrnd.tech/api/v1/deploy?uuid=lfv0921nlqzl0qow9xse4it4` |

Optional: `&force=true`. Response includes `deployment_uuid`.

Inventory: `knowledge/coolify-msqdx-audion-v3-2026-08-03.md`  
URLs: `knowledge/deploy-urls.md`

**Do not** commit API tokens; keep them in Cursor MCP config / secrets only.
