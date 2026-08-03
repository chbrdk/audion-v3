# Coolify build failure — 2026-08-03 (Module not found via msqdx-ui.ts)

**Symptom:** Coolify `audion-v3-web` deploy failed at `RUN npm run build` with:

```
./lib/msqdx-ui.ts
Module not found: Can't resolve 'lucide-react'  # (or react-driftkit)
```

(Commit under test: `8da2b6d` — Button barrel export; root cause is older.)

## Cause

Dockerfile clones `msqdx-ui` and Next compiles **source** via `apps/web/lib/msqdx-ui.ts` barrels (`../../../../msqdx-ui/.../icons.tsx`).

Those DS files import `lucide-react` / `react-driftkit`. Webpack resolves modules by walking **from the DS file path** (`/workspace/msqdx-ui/...`), not from `audion-v3/node_modules`.

`pnpm install` in the `ds` stage creates a content-addressable store + symlinks. `COPY --from=ds` into the builder stage often leaves those symlinks broken → Coolify sees `Module not found` on the barrel. Local builds work because the sibling checkout has a live pnpm store.

## Fix

1. Dockerfile `ds` stage: `node-linker=hoisted` before `pnpm install` so `node_modules` are real files that survive COPY.
2. `apps/web/next.config.ts`: add workspace `node_modules` to `resolve.modules` so sibling DS imports also find audion installs.
3. Declare `lucide-react` on `apps/web` (already had `react-driftkit`).

## Verify

```bash
cd apps/web && npx vitest run __tests__/dockerfile-packaging.test.ts
cd apps/web && npm run build
# Coolify: Redeploy audion-v3-web; expect green next build
```

Related: `knowledge/coolify-build-fix-2026-07-30.md` (Flyout missing on remote DS).
