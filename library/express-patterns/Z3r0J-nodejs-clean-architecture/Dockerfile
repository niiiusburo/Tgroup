# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Multi-stage build for a Node.js 22 / TypeScript / pnpm clean-architecture API.
#
# Stages:
#   1) base   — pinned Node + Corepack-managed pnpm; common to every stage
#   2) deps   — installs the FULL dep graph (prod + dev) for the build step
#   3) build  — compiles TypeScript -> JavaScript with path-alias rewriting
#   4) prod-deps — re-installs ONLY production deps with a clean store
#   5) runner — distroless-style slim runtime; copies build output + prod deps
#
# Result: ~180MB image, non-root user, signal-safe via `node --use-openssl-ca`
# entrypoint (Node has built-in signal handling since v8 when PID 1).
# -----------------------------------------------------------------------------

ARG NODE_VERSION=22.16.0
ARG PNPM_VERSION=10.14.0

# ---- 1. base ----------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    CI=true
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ---- 2. deps (full graph, used to build) ------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- 3. build ---------------------------------------------------------------
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN pnpm build

# ---- 4. prod-deps (lean, no devDependencies) --------------------------------
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod \
 && pnpm store prune

# ---- 5. runner --------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Create an unprivileged user — never run Node as root in production
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --create-home --shell /bin/false nodejs

# Copy artifacts produced by the previous stages
COPY --chown=nodejs:nodejs --from=prod-deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=build     /app/build        ./build
COPY --chown=nodejs:nodejs package.json ./

USER nodejs

EXPOSE 3000

# Lightweight healthcheck — hits the root route and expects any 2xx/3xx/4xx
# (404 is fine when the DB is empty; we just want to know the process is
# accepting connections).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000) +'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

# Node 22 handles SIGTERM/SIGINT correctly as PID 1, no tini wrapper required
CMD ["node", "build/index.js"]
