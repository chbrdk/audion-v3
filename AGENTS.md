# AGENTS.md — AUDION v3

1. Specs first. Update `specs/domain` or `specs/api` before changing behavior.
2. Shared UI primitives come from `@msqdx/ui`. Do not create app-local replacements when the primitive belongs in `msqdx-ui`.
3. No hardcoded URLs, paths, or service bases. Use env + `apps/web/lib/runtime-config.ts` and document canonical values in `knowledge/paths.md`.
4. Tests with every change: UI smoke, contract checks, and build validation.
5. Use `packages/contracts` for stable persona list/detail shapes consumed by the app.
