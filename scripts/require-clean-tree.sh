#!/usr/bin/env bash
# require-clean-tree.sh
#
# Refuse to proceed if the git working tree has uncommitted changes.
# Used by every deploy / docker-build path so that NK, NK2, NK3 etc. can
# never be deployed from a dirty tree again.
#
# Why: between Apr–May 2026 the Excel revenue export "lost" the Note column
# five separate times. Root cause was that fixes lived only in the working
# tree, NK2 was being built from that dirty tree, and every fresh checkout
# silently regressed. This guard removes that failure mode at the source.
#
# Usage:
#   source scripts/require-clean-tree.sh                  # exits if dirty
#   bash   scripts/require-clean-tree.sh && <deploy cmd>  # gates a command
#
# Override (use sparingly, e.g. emergency hotfix from console):
#   ALLOW_DIRTY_BUILD=1 ./scripts/require-clean-tree.sh
#
# Exit codes: 0 = clean, 1 = dirty (or not in a git repo).

set -euo pipefail

if [ "${ALLOW_DIRTY_BUILD:-0}" = "1" ]; then
  echo "⚠️  ALLOW_DIRTY_BUILD=1 — bypassing clean-tree check. Note this in your deploy log."
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ require-clean-tree: not inside a git repository. Refusing to proceed."
  echo "   (set ALLOW_DIRTY_BUILD=1 to override — but you almost never want to)"
  exit 1
fi

DIRTY="$(git status --porcelain)"

if [ -n "$DIRTY" ]; then
  echo "❌ require-clean-tree: working tree has uncommitted changes."
  echo ""
  echo "$DIRTY" | head -30
  TOTAL=$(echo "$DIRTY" | wc -l | tr -d ' ')
  if [ "$TOTAL" -gt 30 ]; then
    echo "   …and $((TOTAL - 30)) more"
  fi
  echo ""
  echo "Refusing to build/deploy from a dirty tree."
  echo "Either:"
  echo "  1. Commit the changes:  git add -p && git commit -m '…'"
  echo "  2. Stash them:          git stash"
  echo "  3. Override (rare):     ALLOW_DIRTY_BUILD=1 <your command>"
  exit 1
fi

# Optional: also refuse if HEAD isn't pushed to origin (catches commits
# that exist locally but are not on the remote — which would mean the
# deployed code is unreviewable from another machine).
if git remote get-url origin >/dev/null 2>&1; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD)
  if [ "$BRANCH" != "HEAD" ]; then
    LOCAL_SHA=$(git rev-parse HEAD)
    REMOTE_SHA=$(git ls-remote origin "$BRANCH" 2>/dev/null | awk '{print $1}')
    if [ -n "$REMOTE_SHA" ] && [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
      echo "⚠️  require-clean-tree: local HEAD ($LOCAL_SHA) ≠ origin/$BRANCH ($REMOTE_SHA)."
      echo "   Deployment will be from a commit that is NOT on origin."
      echo "   Recommended: git push origin $BRANCH"
      echo "   Proceeding anyway (this is a warning, not a block)."
    fi
  fi
fi

echo "✓ require-clean-tree: working tree clean (HEAD=$(git rev-parse --short HEAD))"
