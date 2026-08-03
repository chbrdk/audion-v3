# Coolify web deploy failed after successful Next build — 2026-08-03

**App:** `audion-v3:main-app` (`putvwgqq1c9yb30tsqosujde`)  
**Symptom:** Coolify log ends with green `next build`, then:

```
#22 [runner 9/17] COPY --from=builder …/apps/web/.next …
========================================
Deployment failed. Removing the new version of your application.
Gracefully shutting down build container: …
```

## Not the cause

- `middleware` → `proxy` deprecation warning
- `jose` CompressionStream / Edge Runtime warnings under next-auth
- TypeScript / route generation (all completed)

## Likely cause

Infra abort while packing the **runner** image: full `node_modules` was already copied (#18 DONE 6.2s), then `.next` COPY failed or Coolify killed the build container (disk / memory / concurrent builds on `build` server `fkk408ggggkwgw0w4kkgk0o8`, `concurrent_builds=2`, cleanup threshold 80%).

Coolify rolled back → previous web container still `running`.

## P4 action

Commit `cf780de` is **agent-only** for runtime. Redeploy **`audion-v3-ux-journey-agent`** (`lfv0921nlqzl0qow9xse4it4`) only. Skip web until disk/cleanup or Dockerfile slim-down.

## Follow-ups (optional)

1. Build server: Docker prune / free disk; avoid parallel heavy builds.
2. Dockerfile: `output: 'standalone'` + copy `.next/standalone` instead of full `node_modules` (shrink runner COPY).
3. Retry web deploy alone after agent is green.
