# Coolify build failure — 2026-07-30

**Symptom:** Coolify deploy of `chbrdk/audion-v3:main` failed at `RUN npm run build` (`next build --webpack`).

## Round 1 — audion-v3 compile errors (`0818eec` → `2239809`)

1. **Wrong relative import depth** under nested `app/api/...` routes (e.g. journey phase generate needed more `../` to reach `lib/`).
2. **DS API drift vs `@msqdx/ui`:** `Input.invalid` → use `Field` `error`; `Dialog.onOpenChange` → `onClose`; `Button variant="secondary"` → `subtle`; `SectionChrome as="h4"` → `h3`.
3. **Contract completeness:** normalizers for personas/target-groups must return `profileDe` / `headlineDe` / `knowledgeEntries` / `documents`; AI workflow `pathParams` typed as `Record<string, string>`; middleware NextAuth call without `NextFetchEvent`.

## Round 2 — missing DS on GitHub (`2239809` Docker clone)

**Symptom:** `Module not found` from `apps/web/lib/msqdx-ui.ts` for `Flyout` / chat icons.

**Cause:** Dockerfile clones `https://github.com/chbrdk/msqdx-ui.git` `main`. Flyout + `IconShare` / `IconHistory` / … existed only in the local sibling checkout, not on remote `main`. Local `npm run build` succeeded; Coolify failed.

**Fix:** Push Flyout package to `chbrdk/msqdx-ui` `main`, then redeploy audion-v3 (no audion code change required once DS is public).

**Verify before redeploy:**

```bash
# DS must expose Flyout on the branch Docker clones
git ls-remote https://github.com/chbrdk/msqdx-ui.git HEAD
# Local audion still green
cd apps/web && npm run build
```

**Redeploy:** Coolify → audion-v3-web → Redeploy (rebuild clones fresh `msqdx-ui`).
