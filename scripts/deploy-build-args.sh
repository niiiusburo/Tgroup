#!/usr/bin/env bash
# deploy-build-args.sh
#
# Single entry point that prepares safe docker-build arguments for any
# TGroup deploy (NK / NK2 / NK3). Combines:
#   - require-clean-tree.sh  (Layer 1: refuse dirty deploys)
#   - deploy-preflight.js    (Layer 2: refuse stale worktree deploys)
#   - GIT_SHA + GIT_BRANCH   (Layer 3: stamp real commit into version.json)
#
# Usage from a shell:
#   source scripts/deploy-build-args.sh
#   docker compose up -d --build web
#
# Usage from a CI / VPS deploy script:
#   bash scripts/deploy-build-args.sh && docker compose up -d --build web
#
# Override (rare, hotfix only):
#   ALLOW_DIRTY_BUILD=1 source scripts/deploy-build-args.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Layer 1 — refuse a dirty tree
bash "$SCRIPT_DIR/require-clean-tree.sh"

# Layer 2 — refuse deploys that would erase the live target's current commit
node "$SCRIPT_DIR/deploy-preflight.js"

# Layer 3 — export build args for the Docker build
export GIT_SHA="$(git rev-parse HEAD)"
export GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

echo "✓ deploy-build-args:"
echo "  GIT_SHA=$GIT_SHA"
echo "  GIT_BRANCH=$GIT_BRANCH"
echo ""
echo "Use:  docker compose up -d --build web   (or specify other services)"
