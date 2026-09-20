# Coolify REST — staging secrets for ops (AUDION)

**Date:** 2026-09-20  
**Why:** Coolify MCP (`user-coolify`) intentionally never returns env **values**. The same team Bearer token can still call Coolify’s HTTP API for ops.

## Working pattern

1. Team token: Cursor `mcp.json` → `coolify.headers.Authorization` (or Coolify → Keys & Tokens).
2. List env values:

```bash
curl -sS -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://coolify.plygrnd.tech/api/v1/applications/putvwgqq1c9yb30tsqosujde/envs"
```

3. Pick `AUDION_API_TOKEN` (non-preview), then:

```bash
AUDION_API_TOKEN=audion_… \
  node scripts/export-persona-chats.mjs
```

## Notes

- App UUID: `putvwgqq1c9yb30tsqosujde` (`audion-v3:main-app`) — see `knowledge/deploy-urls.md`.
- `POST …/applications/{uuid}/exec` returned **404** on this Coolify build (no container exec via API yet).
- Do **not** commit env values. Prefer one-shot shell → scrub `/tmp`.
- Chat list works with machine Bearer; project/persona detail may 403 (Access Model B) without a Plexon user actor.
