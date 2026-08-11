# Coolify build failure — 2026-08-11 (ChatOverlay / dual @types/react)

**Symptom:** Coolify `audion-v3` deploy failed at `RUN npm run build` with:

```
./components/platform-assistant-host.tsx
Type error: 'ChatOverlay' cannot be used as a JSX component.
  … ReactNode is not assignable to type 'ReactNode | Promise<ReactNode>'
```

(Related checkion failure the same day: `Module not found: …/ChatOverlay` because `MSQDX_UI_REF` predated the primitive.)

## Cause

Sibling `msqdx-ui` was cloned on floating `main` with its own `node_modules` / `@types/react`. Compiling DS source next to the app yields two React type trees; `ChatOverlay`’s portal return type then fails JSX assignability. See `msqdx-ui/knowledge/react-types-dedupe.md`.

## Fix

1. Pin `MSQDX_UI_REF` (same SHA family as brandion/checkion; includes ChatOverlay + `ReactNode` return type).
2. After DS `pnpm build`, delete all DS `node_modules` before COPY (also avoids Coolify OOM).
3. After app `npm ci`, `ln -s /workspace/audion-v3/node_modules /workspace/msqdx-ui/node_modules`, then remove the symlink after `next build`.
4. Keep webpack `resolve.modules` preferring audion workspace installs.

## Verify

```bash
cd apps/web && npx vitest run __tests__/dockerfile-packaging.test.ts
# Coolify force-deploy audion-v3 — expect green next build
```

Related: `knowledge/coolify-build-fix-2026-08-03-msqdx-modules.md`.
