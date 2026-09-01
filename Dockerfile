# AUDION v3 – Docker image for Coolify / self-hosted.
# Context: repository root (audion-v3).
# Build:  docker build -t audion-v3 .
# Run:    docker run -p 3000:3000 -e AUTH_SECRET=… -e DATABASE_URL=… audion-v3
#
# Sibling design system: fetches github.com/chbrdk/msqdx-ui at MSQDX_UI_REF next
# to the app so webpack aliases (`../../../msqdx-ui/…`) and barrels resolve.
# Coolify: Dockerfile path `Dockerfile`, domain https://audion-v3.projects-a.plygrnd.tech
# (see knowledge/deploy-urls.md).

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- Base ----
FROM ${NODE_IMAGE} AS base
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# ---- Design system (msqdx-ui) ----
# Pin a commit (not floating `main`) so Coolify cannot reuse a stale `ds` layer
# that predates ChatOverlay — and so builds stay reproducible.
# Bump MSQDX_UI_REF whenever audion barrels need a newer primitive from chbrdk/msqdx-ui.
FROM base AS ds
ARG MSQDX_UI_REPO=https://github.com/chbrdk/msqdx-ui.git
# msqdx-ui origin/main @ 2026-08-27 (BrandCorner launcher, AppShell 24px, MarkdownProse, …)
ARG MSQDX_UI_REF=68879023dd999226908c61d720a81cc9e798b2dc
RUN git init /workspace/msqdx-ui \
    && cd /workspace/msqdx-ui \
    && git remote add origin "${MSQDX_UI_REPO}" \
    && git fetch --depth 1 origin "${MSQDX_UI_REF}" \
    && git checkout --force FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "${MSQDX_UI_REF}" \
    && printf 'node-linker=hoisted\n' > .npmrc \
    && pnpm install --frozen-lockfile \
    && pnpm build \
    # Drop install trees before COPY — full node_modules OOMs Coolify (exit 255).
    # Builder re-links audion node_modules for @types/react + peer resolution.
    && rm -rf node_modules \
    && find . -type d -name node_modules -prune -exec rm -rf {} +

# ---- Builder ----
FROM base AS builder
ENV NODE_ENV=development
COPY --from=ds /workspace/msqdx-ui /workspace/msqdx-ui
COPY . /workspace/audion-v3
WORKDIR /workspace/audion-v3

# --include=dev: Coolify may inject NODE_ENV=production as a build ARG before this
# stage; without it, typescript/devDeps are omitted and `next build` fails.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --include=dev

# Sibling layout: …/workspace/audion-v3 + …/workspace/msqdx-ui
# One node_modules for app + DS source (avoids dual @types/react / ChatOverlay JSX break).
# See msqdx-ui/knowledge/react-types-dedupe.md
RUN test -d /workspace/msqdx-ui/packages/ui/src \
    && test -f /workspace/msqdx-ui/packages/ui-tokens/dist/index.js \
    && test -f /workspace/msqdx-ui/packages/ui/src/components/ChatOverlay.tsx \
    && test -f /workspace/msqdx-ui/packages/ui/src/components/BrandCornerProductMenu.tsx \
    && grep -q "export { ChatOverlay }" /workspace/msqdx-ui/packages/ui/src/index.ts \
    && grep -q "export { BrandCornerProductMenu }" /workspace/msqdx-ui/packages/ui/src/index.ts \
    && rm -rf /workspace/msqdx-ui/node_modules \
    && ln -s /workspace/audion-v3/node_modules /workspace/msqdx-ui/node_modules \
    && test -d /workspace/msqdx-ui/node_modules/@types/react

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN npm run build \
    # Runner must not inherit the absolute symlink into audion node_modules.
    && rm -f /workspace/msqdx-ui/node_modules

# ---- Runner ----
FROM ${NODE_IMAGE} AS runner
WORKDIR /workspace/audion-v3

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

COPY --from=builder /workspace/audion-v3/package.json ./package.json
COPY --from=builder /workspace/audion-v3/package-lock.json ./package-lock.json
COPY --from=builder /workspace/audion-v3/node_modules ./node_modules
COPY --from=builder /workspace/audion-v3/packages ./packages
COPY --from=builder /workspace/audion-v3/apps/web/package.json ./apps/web/package.json
COPY --from=builder /workspace/audion-v3/apps/web/public ./apps/web/public
COPY --from=builder /workspace/audion-v3/apps/web/.next ./apps/web/.next
COPY --from=builder /workspace/audion-v3/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /workspace/audion-v3/apps/web/tsconfig.json ./apps/web/tsconfig.json
COPY --from=builder /workspace/audion-v3/apps/web/drizzle.config.ts ./apps/web/drizzle.config.ts
COPY --from=builder /workspace/audion-v3/apps/web/lib ./apps/web/lib
COPY --from=builder /workspace/audion-v3/scripts ./scripts
# Runtime webpack aliases still resolve into msqdx-ui source (server components / SSR).
COPY --from=builder /workspace/msqdx-ui /workspace/msqdx-ui

RUN chmod +x ./scripts/docker-entrypoint.sh ./scripts/check-database-url.mjs

WORKDIR /workspace/audion-v3
CMD ["./scripts/docker-entrypoint.sh"]
