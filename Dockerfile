# AUDION v3 – Docker image for Coolify / self-hosted.
# Context: repository root (audion-v3).
# Build:  docker build -t audion-v3 .
# Run:    docker run -p 3000:3000 -e AUTH_SECRET=… -e DATABASE_URL=… audion-v3
#
# Sibling design system: clones github.com/chbrdk/msqdx-ui next to the app
# so webpack aliases (`../../../msqdx-ui/…`) and barrels resolve.
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
FROM base AS ds
ARG MSQDX_UI_REPO=https://github.com/chbrdk/msqdx-ui.git
ARG MSQDX_UI_BRANCH=main
RUN git clone --depth 1 -b "${MSQDX_UI_BRANCH}" "${MSQDX_UI_REPO}" /workspace/msqdx-ui \
    && cd /workspace/msqdx-ui \
    && pnpm install --frozen-lockfile \
    && pnpm build

# ---- Builder ----
FROM base AS builder
ENV NODE_ENV=development
COPY --from=ds /workspace/msqdx-ui /workspace/msqdx-ui
COPY . /workspace/audion-v3
WORKDIR /workspace/audion-v3

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Ensure sibling layout matches local monorepo: …/GITHUB/audion-v3 + …/GITHUB/msqdx-ui
RUN test -d /workspace/msqdx-ui/packages/ui/src \
    && test -f /workspace/msqdx-ui/packages/ui-tokens/dist/index.js

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN npm run build

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
COPY --from=builder /workspace/audion-v3/apps/web/lib/db ./apps/web/lib/db
COPY --from=builder /workspace/audion-v3/scripts ./scripts
# Runtime webpack aliases still resolve into msqdx-ui source (server components / SSR).
COPY --from=builder /workspace/msqdx-ui /workspace/msqdx-ui

RUN chmod +x ./scripts/docker-entrypoint.sh ./scripts/check-database-url.mjs

WORKDIR /workspace/audion-v3
CMD ["./scripts/docker-entrypoint.sh"]
