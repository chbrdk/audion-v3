# Coolify build failure — 2026-07-30

**Symptom:** Coolify deploy of `chbrdk/audion-v3:main` failed at `RUN npm run build` (`next build --webpack`).

**Root causes fixed locally (then ship to `main`):**

1. **Wrong relative import depth** under nested `app/api/...` routes (e.g. journey phase generate needed more `../` to reach `lib/`).
2. **DS API drift vs `@msqdx/ui`:** `Input.invalid` → use `Field` `error`; `Dialog.onOpenChange` → `onClose`; `Button variant="secondary"` → `subtle`; `SectionChrome as="h4"` → `h3`.
3. **Contract completeness:** normalizers for personas/target-groups must return `profileDe` / `headlineDe` / `knowledgeEntries` / `documents`; AI workflow `pathParams` typed as `Record<string, string>`; middleware NextAuth call without `NextFetchEvent`.

**Verify before redeploy:** `cd apps/web && npm run build` must exit 0.

**Redeploy:** Coolify → audion-v3-web → Redeploy after push to `main`.
