# PLEXON Persona-Generate Compatibility (2026-08-09)

## Issue

PLEXON Event Quick Check calls:

`POST /api/target-groups/{id}/personas/generate`

AUDION UI / AI workflows use:

`POST /api/ai/target-groups/{id}/personas/generate`

Without the non-`/ai` alias, Next returns **404 HTML** (often via login middleware), which PLEXON reports as “Web statt FastAPI”.

## Fix

Alias route: `apps/web/app/api/target-groups/[targetGroupId]/personas/generate/route.ts`  
→ same native/stub runner as the `/api/ai/…` route.

Path helper: `paths.apiTargetGroupPersonasGenerate`.

## Smoke

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $AUDION_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"segment":"B2C","description":"test","count":1}' \
  "https://audion-v3.projects-a.plygrnd.tech/api/target-groups/<tgId>/personas/generate"
```

Expect `201` JSON with `{ personas: [{ id, name, role }] }`, not HTML.
